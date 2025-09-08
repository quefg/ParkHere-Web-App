from django.core.mail import send_mail
from django.utils import timezone

def send_password_change_confirmation(user, change_type='reset'):
    """
    Send a confirmation email after password change/reset
    change_type can be either 'reset' or 'change'
    """
    action = 'reset' if change_type == 'reset' else 'changed'
    
    subject = f'Your ParkHere password has been {action} successfully'
    message = (
        f"Hi {user.email},\n\n"
        f"Your password for your ParkHere account has been successfully {action} "
        f"on {timezone.now().strftime('%B %d, %Y at %I:%M %p')}.\n\n"
        "If you did not request this, please contact us immediately at ParkHereParkHere@gmail.com.\n\n"
        "Best regards,\n"
        "ParkHere Team"
    )
    
    send_mail(
        subject=subject,
        message=message,
        from_email='ParkHereParkHere@gmail.com',
        recipient_list=[user.email],
        fail_silently=False,
    ) 