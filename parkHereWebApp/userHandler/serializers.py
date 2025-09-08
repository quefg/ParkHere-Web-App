from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import SavedCarpark, SavedSearch

User = get_user_model()

# User Serializer
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'role']
        extra_kwargs = {'password': {'write_only': True}}

# Saved Carpark Serializer
class SavedCarparkSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedCarpark
        fields = ['id', 'carpark_name', 'saved_at']

# Saved Search Serializer
class SavedSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedSearch
        fields = ['id', 'search_query', 'searched_at']
