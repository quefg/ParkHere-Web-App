# In userHandler/urls.py
from django.urls import path
from django.contrib.auth import views as auth_views
from . import views
from .forms import CustomPasswordResetForm
from .views import CustomPasswordResetConfirmView

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.user_login, name='login'),
    path('logout/', views.user_logout, name='logout'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('check-auth/', views.check_auth, name='check_auth'),
    path('check-role/', views.check_role, name='check_role'),
    path('check-email/', views.check_email, name='check_email'),
    path('settings/', views.settings, name='settings'),
    path('change-password/', views.change_password, name='change_password'),
    path('delete-account/', views.delete_account, name='delete_account'),
    path('save-location/', views.save_location, name='save_location'),
    path('saved-locations/', views.get_saved_locations, name='get_saved_locations'),
    path('delete-location/<int:location_id>/', views.delete_location, name='delete_location'),
    path('password-reset/', 
         auth_views.PasswordResetView.as_view(
             template_name='userUI/password_reset_form.html',
             form_class=CustomPasswordResetForm
         ),
         name='password_reset'),
    path('password-reset/done/',
         auth_views.PasswordResetDoneView.as_view(
             template_name='userUI/password_reset_done.html'
         ),
         name='password_reset_done'),
    path('password-reset-confirm/<uidb64>/<token>/',
         CustomPasswordResetConfirmView.as_view(
             template_name='userUI/password_reset_confirm.html'
         ),
         name='password_reset_confirm'),
    path('password-reset-complete/',
         auth_views.PasswordResetCompleteView.as_view(
             template_name='userUI/password_reset_complete.html'
         ),
         name='password_reset_complete'),
]