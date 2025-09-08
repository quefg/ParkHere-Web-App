from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate, get_user_model
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.urls import reverse_lazy
from .models import SavedCarpark, SavedSearch, SavedLocation
from .forms import CustomUserCreationForm, CustomPasswordChangeForm, CustomPasswordResetForm, CustomAuthenticationForm
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.forms import AuthenticationForm, SetPasswordForm
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone
from django.contrib.auth.views import PasswordResetConfirmView
from django.urls import reverse
from django.contrib.sites.shortcuts import get_current_site
import json
import logging
from .utils import send_password_change_confirmation
from django.db.utils import IntegrityError

logger = logging.getLogger(__name__)

def register(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, "Registration successful!")
            return redirect('/map/')  # Use absolute URL path
    else:
        form = CustomUserCreationForm()
    return render(request, 'userUI/register.html', {'form': form})

def user_login(request):
    if request.method == 'POST':
        form = CustomAuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            messages.success(request, "Successfully logged in!")
            return redirect('/map/')  # Use absolute URL path
        else:
            messages.error(request, "Invalid email or password.")
    else:
        form = CustomAuthenticationForm()
    
    return render(request, 'userUI/login.html', {'form': form})

def user_logout(request):
    logout(request)
    messages.info(request, "You have been logged out.")
    return redirect('/map/')  # Use absolute URL path

@login_required
def dashboard(request):
    # The saved carparks will be handled by JavaScript on the client side
    # since we're storing them in localStorage
    return render(request, 'userUI/dashboard.html')

@login_required
def save_carpark(request, carpark_id, name, address, lat, lon):
    carpark, created = SavedCarpark.objects.get_or_create(
        user=request.user,
        carpark_id=carpark_id,
        defaults={'name': name, 'address': address, 'latitude': lat, 'longitude': lon}
    )
    if created:
        messages.success(request, "Carpark saved successfully!")
    else:
        messages.info(request, "Carpark already saved.")
    
    return redirect('dashboard')  # redirect to the dashboard after saving the carpark

def check_auth(request):
    return JsonResponse({
        'is_authenticated': request.user.is_authenticated,
        'is_admin': request.user.is_authenticated and request.user.is_staff
    })

@login_required
def settings(request):
    form = CustomPasswordChangeForm(request.user)
    return render(request, 'userUI/settings.html', {'form': form})

@login_required
def change_password(request):
    if request.method == 'POST':
        form = CustomPasswordChangeForm(user=request.user, data=request.POST)
        if form.is_valid():
            form.save()
            try:
                # Send confirmation email for password change
                send_password_change_confirmation(request.user, change_type='change')
                messages.success(request, 'Your password was changed successfully. A confirmation email has been sent.')
            except Exception as e:
                logger.error(f'Failed to send password change confirmation email: {str(e)}')
                messages.warning(request, 'Your password was changed, but we could not send the confirmation email.')
            return redirect('settings')
    else:
        form = CustomPasswordChangeForm(user=request.user)
    
    return render(request, 'userUI/change_password.html', {'form': form})

@login_required
@require_http_methods(["POST"])
def save_location(request):
    try:
        data = json.loads(request.body)
        
        # Check if location with same coordinates already exists
        existing_location = SavedLocation.objects.filter(
            user=request.user,
            latitude=data['latitude'],
            longitude=data['longitude']
        ).first()
        
        if existing_location:
            return JsonResponse({
                'status': 'error',
                'message': 'Location already saved'
            }, status=400)
            
        location = SavedLocation.objects.create(
            user=request.user,
            name=data['name'],
            latitude=data['latitude'],
            longitude=data['longitude'],
            address=data.get('address', '')  # Optional address field
        )
        return JsonResponse({
            'status': 'success',
            'message': 'Location saved successfully',
            'location': {
                'id': location.id,
                'name': location.name,
                'latitude': location.latitude,
                'longitude': location.longitude,
                'address': location.address
            }
        })
    except IntegrityError as e:
        if 'unique constraint' in str(e).lower():
            return JsonResponse({
                'status': 'error',
                'message': 'Name already exists, please choose a unique name'
            }, status=400)
        else:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=400)
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=400)

@login_required
def get_saved_locations(request):
    locations = SavedLocation.objects.filter(user=request.user).order_by('-saved_at')
    return JsonResponse({
        'locations': list(locations.values('id', 'name', 'latitude', 'longitude', 'address'))
    })

@login_required
@require_http_methods(["POST"])
def delete_location(request, location_id):
    try:
        location = SavedLocation.objects.get(id=location_id, user=request.user)
        location.delete()
        return JsonResponse({
            'status': 'success',
            'message': 'Location deleted successfully'
        })
    except SavedLocation.DoesNotExist:
        return JsonResponse({
            'status': 'error',
            'message': 'Location not found'
        }, status=404)
    except Exception as e:
        logger.error(f'Error deleting location: {str(e)}')
        return JsonResponse({
            'status': 'error',
            'message': 'An error occurred while deleting the location'
        }, status=500)

class CustomPasswordResetConfirmView(PasswordResetConfirmView):
    success_url = reverse_lazy('login')
    template_name = 'userUI/password_reset_confirm.html'

    def form_valid(self, form):
        logger.info('Password reset form is valid, about to save')
        response = super().form_valid(form)
        logger.info('Password has been reset successfully')

        try:
            # Send confirmation email using our utility function
            send_password_change_confirmation(self.user, change_type='reset')
            logger.info(f'Password reset confirmation email sent to {self.user.email}')
            messages.success(self.request, 'Your password has been reset successfully. A confirmation email has been sent.')
        except Exception as e:
            logger.error(f'Failed to send confirmation email: {str(e)}')
            messages.warning(self.request, 'Your password was reset, but we could not send the confirmation email.')

        return response

@require_http_methods(["POST"])
def check_email(request):
    email = json.loads(request.body).get('email')
    exists = get_user_model().objects.filter(email=email).exists()
    return JsonResponse({'exists': exists})

@login_required
def check_role(request):
    return JsonResponse({
        'is_admin': request.user.role == 1  # 1 represents admin role
    })

@login_required
@require_http_methods(["POST"])
def delete_account(request):
    try:
        user = request.user
        # Log the user out
        logout(request)
        # Delete the user account
        user.delete()
        messages.success(request, "Your account has been successfully deleted.")
        return redirect('login')
    except Exception as e:
        logger.error(f'Error deleting account: {str(e)}')
        messages.error(request, "An error occurred while deleting your account. Please try again.")
        return redirect('settings')
