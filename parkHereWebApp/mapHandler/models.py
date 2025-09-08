from django.db import models

class Carpark(models.Model):
    carParkNo = models.CharField(max_length=20, unique=True)  # Unique identifier
    address = models.TextField()  # Full address
    
    # Coordinates for Mapbox
    xCoord = models.FloatField()  # X coordinate (probably longitude)
    yCoord = models.FloatField()  # Y coordinate (probably latitude)
    
    # Carpark attributes
    carParkType = models.CharField(max_length=50)  # E.g., Surface, Multi-storey
    typeOfParkingSystem = models.CharField(max_length=50)  # E.g., Electronic, Coupon
    shortTermParking = models.CharField(max_length=50)  # E.g., "Whole day", "No parking"
    freeParking = models.CharField(max_length=50)  # E.g., "Yes", "No", "Sunday/Public Holiday"
    nightParking = models.BooleanField(default=False)  # Boolean for easier filtering
    carParkDecks = models.IntegerField(null=True, blank=True)  # Number of decks (if applicable)
    gantryHeight = models.FloatField(null=True, blank=True)  # Height in meters (if applicable)
    carParkBasement = models.BooleanField(default=False)  # Boolean for basement parking
        # New columns to track central area and peak hour
    centralArea = models.BooleanField(default=False)
    peakHour = models.BooleanField(default=False)  # Whether peak hour charges apply
    peakHourStart = models.TimeField(null=True, blank=True)  # Start time of peak hour
    peakHourEnd = models.TimeField(null=True, blank=True)  # End time of peak hour
    freeParking = models.CharField(max_length=3, choices=[('YES', 'Yes'), ('NO', 'No')], default='NO')

    def __str__(self):
        return f"{self.carParkNo} - {self.address}"
