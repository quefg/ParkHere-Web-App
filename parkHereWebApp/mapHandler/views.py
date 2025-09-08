from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Carpark
from .serializers import CarparkSerializer


class CarparkListView(APIView):
    def get(self, request):
        carparks = Carpark.objects.all()
        serializer = CarparkSerializer(carparks, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

def index(request):
    return render(request, 'mapUI/index.html')  # No need for "templates/" prefix

from django.http import JsonResponse
from .models import Carpark

def get_carpark_details(request, carpark_name):
    try:
        carpark = Carpark.objects.get(carParkNo=carpark_name)
        return JsonResponse({
            "name": carpark.carParkNo,
            "address": carpark.address,
            "latitude": carpark.yCoord,
            "longitude": carpark.xCoord,
        })
    except Carpark.DoesNotExist:
        return JsonResponse({"error": "Carpark not found"}, status=404)
