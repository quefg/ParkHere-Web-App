from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 1)  # Admin role
        return self.create_user(email, password, **extra_fields)

# Custom User Model
class User(AbstractUser):
    ROLE_CHOICES = [
        (0, 'User'),
        (1, 'Admin'),
    ]
    username = None  # Remove username field
    email = models.EmailField(unique=True)
    role = models.IntegerField(choices=ROLE_CHOICES, default=0)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    def __str__(self):
        return self.email

# Saved Carparks Model
class SavedCarpark(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_carparks')
    carpark_name = models.CharField(max_length=255)
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'carpark_name')  # Prevent duplicate carparks for the same user
        indexes = [models.Index(fields=['user', 'carpark_name'])]  # Optimize queries

    def __str__(self):
        return f"{self.user.email} - {self.carpark_name}"

# Saved Searches Model
class SavedSearch(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_searches')
    search_query = models.CharField(max_length=255)
    searched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['user', 'searched_at'])]  # Optimize search history lookup

    def __str__(self):
        return f"{self.user.email} - {self.search_query}"

# Saved Locations Model
class SavedLocation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_locations')
    name = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()
    address = models.TextField(null=True, blank=True)
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'name')  # Prevent duplicate location names for the same user
        indexes = [
            models.Index(fields=['user', 'name']),  # Optimize location lookup by user and name
            models.Index(fields=['user', 'saved_at']),  # Optimize sorting by save date
        ]

    def __str__(self):
        return f"{self.user.email} - {self.name}"
