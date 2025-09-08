from django.contrib import admin
from .models import Carpark

@admin.register(Carpark)
class CarparkAdmin(admin.ModelAdmin):
    list_display = ("carParkNo", "address", "carParkType", "shortTermParking")
