from django.urls import path
from .views import index, CarparkListView, get_carpark_details
print(CarparkListView)  # Check if it imports correctly

urlpatterns = [
    path('', index, name='index'),  # When accessing /map/, it loads mapUI/index.html
    path('api/carparks/', CarparkListView.as_view(), name='carpark-list'),
    path('api/carpark-details/<str:carpark_name>/', get_carpark_details, name='carpark-details'),
]
