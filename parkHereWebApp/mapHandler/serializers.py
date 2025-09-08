from rest_framework import serializers
from .models import Carpark

class CarparkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Carpark
        fields = [
            'carParkNo', 'address', 'xCoord', 'yCoord',
            'carParkType', 'typeOfParkingSystem', 'shortTermParking',
            'freeParking', 'nightParking', 'carParkDecks', 'gantryHeight',
            'carParkBasement', 'centralArea', 'peakHour',
            'peakHourStart', 'peakHourEnd',
        ]
