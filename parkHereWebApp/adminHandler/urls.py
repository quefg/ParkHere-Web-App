from django.urls import path
from . import views

urlpatterns = [
    path('carparks/', views.carpark_list, name='carpark_list'),
    path('carparks/add/', views.carpark_add, name='carpark_add'),
    path('carparks/<int:pk>/edit/', views.carpark_edit, name='carpark_edit'),
    path('carparks/<int:pk>/delete/', views.carpark_delete, name='carpark_delete'),
    path('carparks/bulk-delete/', views.carpark_bulk_delete, name='carpark_bulk_delete'),
    path('api/carparks/check-duplicate/<str:carpark_no>/', views.check_carpark_no, name='check_carpark_no'),
]
