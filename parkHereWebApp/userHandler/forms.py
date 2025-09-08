from django import forms
from django.contrib.auth.forms import UserCreationForm, PasswordChangeForm, PasswordResetForm, AuthenticationForm
from .models import User  # Import your custom user model
from django.contrib.auth import get_user_model, authenticate
from django.utils.translation import gettext_lazy as _
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from django.urls import reverse
from django.contrib.sites.shortcuts import get_current_site

class CustomAuthenticationForm(AuthenticationForm):
    username = forms.EmailField(
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Enter your email'})
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Enter your password'})
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].label = 'Email'

    def clean(self):
        email = self.cleaned_data.get('username')
        password = self.cleaned_data.get('password')

        if email is not None and password:
            self.user_cache = authenticate(self.request, username=email, password=password)
            if self.user_cache is None:
                raise self.get_invalid_login_error()
            else:
                self.confirm_login_allowed(self.user_cache)

        return self.cleaned_data

class CustomUserCreationForm(UserCreationForm):
    email = forms.EmailField(
        max_length=254,
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Enter your email'})
    )
    password1 = forms.CharField(
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Enter password'})
    )
    password2 = forms.CharField(
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Confirm password'})
    )

    class Meta:
        model = get_user_model()
        fields = ('email', 'password1', 'password2')

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if not email:
            return email
        if get_user_model().objects.filter(email=email).exists():
            raise forms.ValidationError(_("User with this Email already exists."))
        return email

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        if commit:
            user.save()
        return user

class CustomPasswordChangeForm(PasswordChangeForm):
    error_messages = {
        **PasswordChangeForm.error_messages,
        'password_same': _("The old and new password must be different."),
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['old_password'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'Enter your current password'
        })
        self.fields['new_password1'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'Enter new password'
        })
        self.fields['new_password2'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'Confirm new password'
        })

    def clean_new_password1(self):
        old_password = self.cleaned_data.get('old_password')
        new_password1 = self.cleaned_data.get('new_password1')
        
        if old_password and new_password1 and old_password == new_password1:
            raise forms.ValidationError(
                self.error_messages['password_same'],
                code='password_same',
            )
        return new_password1

class CustomPasswordResetForm(PasswordResetForm):
    email = forms.EmailField(
        max_length=254,
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Enter your email'})
    )

    def clean_email(self):
        email = self.cleaned_data['email']
        if not get_user_model().objects.filter(email=email, is_active=True).exists():
            raise forms.ValidationError(_("There is no active user associated with this email address"))
        return email

    def send_confirmation_email(self, user, request):
        """
        Send a confirmation email after the password has been reset.
        """
        current_site = get_current_site(request)
        site_name = current_site.name
        domain = current_site.domain

        context = {
            'user': user,
            'timestamp': timezone.now().strftime('%B %d, %Y, %I:%M %p'),
            'login_url': request.build_absolute_uri(reverse('login')),
            'site_name': site_name,
            'domain': domain,
        }

        # Render email templates
        html_content = render_to_string('userUI/email/password_reset_confirmation.html', context)
        text_content = render_to_string('userUI/email/password_reset_confirmation.txt', context)

        # Create email message
        subject = 'Password Reset Confirmation - ParkHere'
        from_email = 'ParkHereParkHere@gmail.com'
        to_email = user.email

        msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send()

    def save(self, domain_override=None, use_https=False, token_generator=None,
            from_email=None, request=None, html_email_template_name=None,
            extra_email_context=None, **kwargs):
        """
        Generate a one-use only link for resetting password and send it to the user.
        """
        return super().save(
            domain_override=domain_override,
            use_https=use_https,
            token_generator=token_generator,
            from_email=from_email,
            request=request,
            html_email_template_name=html_email_template_name,
            extra_email_context=extra_email_context,
            **kwargs
        )
