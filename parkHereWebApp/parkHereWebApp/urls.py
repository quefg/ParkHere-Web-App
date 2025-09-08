"""
URL configuration for parkHereWebApp project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView

urlpatterns = [
    path("map/", include("mapHandler.urls")),
    path("admin/", include("adminHandler.urls")),
    path("user/", include("userHandler.urls")),
    path("carpark/", include("carparkHandler.urls")),
    path('api/carparks/', RedirectView.as_view(url='/map/api/carparks', permanent=True)),  # Redirect /api/carparks to /map/api/carparks
    path('', RedirectView.as_view(url='/map/', permanent=True)),
]