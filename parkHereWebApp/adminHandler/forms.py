from django import forms
from .models import Carpark

class CarparkForm(forms.ModelForm):
    class Meta:
        model = Carpark
        fields = [
            'carParkNo', 'address', 'xCoord', 'yCoord', 'carParkType',
            'typeOfParkingSystem', 'shortTermParking', 'freeParking',
            'nightParking', 'carParkDecks', 'gantryHeight', 'carParkBasement',
            'centralArea', 'peakHour', 'peakHourStart', 'peakHourEnd'
        ]
        widgets = {
            'peakHourStart': forms.TimeInput(attrs={'type': 'time'}),
            'peakHourEnd': forms.TimeInput(attrs={'type': 'time'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make coordinates optional
        self.fields['xCoord'].required = False
        self.fields['yCoord'].required = False
        # Make decks and height optional
        self.fields['carParkDecks'].required = False
        self.fields['gantryHeight'].required = False
        # Make peak hour times optional
        self.fields['peakHourStart'].required = False
        self.fields['peakHourEnd'].required = False

    def clean(self):
        cleaned_data = super().clean()
        peak_hour = cleaned_data.get('peakHour')
        peak_hour_start = cleaned_data.get('peakHourStart')
        peak_hour_end = cleaned_data.get('peakHourEnd')

        if peak_hour and (not peak_hour_start or not peak_hour_end):
            raise forms.ValidationError("Peak hour start and end times are required when peak hour charges apply.")

        return cleaned_data
