from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
import requests
from .models import Carpark
from .forms import CarparkForm
from django.http import JsonResponse
from functools import wraps

def admin_required(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated or request.user.role != 1:  # 1 represents admin role
            raise PermissionDenied("You must be an admin to access this page.")
        return view_func(request, *args, **kwargs)
    return _wrapped_view

@login_required
@admin_required
def carpark_list(request):
    carparks = Carpark.objects.all()
    
    # Fetch availability data from LTA API
    try:
        response = requests.get('https://api.data.gov.sg/v1/transport/carpark-availability')
        if response.status_code == 200:
            availability_data = response.json()
            # Create a dictionary of carpark availability
            availability_dict = {
                item['carpark_number']: {
                    'available': item['carpark_info'][0]['lots_available'],
                    'total': item['carpark_info'][0]['total_lots']
                }
                for item in availability_data['items'][0]['carpark_data']
            }
            # Add availability data to each carpark
            for carpark in carparks:
                carpark.availability = availability_dict.get(carpark.carParkNo, {'available': 'N/A', 'total': 'N/A'})
        else:
            for carpark in carparks:
                carpark.availability = {'available': 'N/A', 'total': 'N/A'}
    except Exception as e:
        for carpark in carparks:
            carpark.availability = {'available': 'N/A', 'total': 'N/A'}
    
    return render(request, 'adminUI/carpark_list.html', {'carparks': carparks})

@login_required
@admin_required
def carpark_add(request):
    form = CarparkForm()  # Initialize the form here (for both GET and POST)
    if request.method == "POST":
        form = CarparkForm(request.POST)
        if form.is_valid():
            try:
                form.save()
                messages.success(request, 'Carpark added successfully!')
                return redirect('carpark_list')
            except Exception as e:
                messages.error(request, f'Error adding carpark: {str(e)}')
        else:
            messages.error(request, f'Form is invalid: {form.errors}')

    return render(request, 'adminUI/carpark_form.html', {'form': form})

@login_required
@admin_required
def carpark_edit(request, pk):
    carpark = get_object_or_404(Carpark, pk=pk)
    if request.method == "POST":
        form = CarparkForm(request.POST, instance=carpark)
        if form.is_valid():
            try:
                form.save()
                messages.success(request, 'Carpark updated successfully!')
                return redirect('carpark_list')
            except Exception as e:
                messages.error(request, f'Error updating carpark: {str(e)}')
    else:
        form = CarparkForm(instance=carpark)
    
    return render(request, 'adminUI/carpark_form.html', {'form': form, 'address': carpark.address})

@login_required
@admin_required
def carpark_delete(request, pk):
    carpark = get_object_or_404(Carpark, pk=pk)
    if request.method == "POST":
        try:
            carpark.delete()
            messages.success(request, 'Carpark deleted successfully!')
            return redirect('carpark_list')
        except Exception as e:
            messages.error(request, f'Error deleting carpark: {str(e)}')
    return render(request, 'adminUI/carpark_confirm_delete.html', {'carpark': carpark})

@login_required
@admin_required
def carpark_bulk_delete(request):
    if request.method == "POST":
        selected_ids = request.POST.getlist('selected_carparks')
        if selected_ids:
            try:
                Carpark.objects.filter(pk__in=selected_ids).delete()
                messages.success(request, f'{len(selected_ids)} carparks deleted successfully!')
            except Exception as e:
                messages.error(request, f'Error deleting carparks: {str(e)}')
        else:
            messages.warning(request, 'No carparks selected for deletion.')
    return redirect('carpark_list')

@login_required
@admin_required
def check_carpark_no(request, carpark_no):
    current_id = request.GET.get('current_id')

    if not carpark_no:
        return JsonResponse({'exists': False})

    query = Carpark.objects.filter(carParkNo=carpark_no)
    if current_id:
        query = query.exclude(pk=current_id)

    exists = query.exists()
    return JsonResponse({'exists': exists})
