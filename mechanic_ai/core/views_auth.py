from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.mail import send_mail
from django.utils import timezone

from core.models import User, EmailOTP
from core.utils.otp import generate_otp


@api_view(["POST"])
def send_email_otp(request):
    email = request.data.get("email")
    phone = request.data.get("phone")

    if not email:
        return Response({"error": "Email is required"}, status=400)

    # ✅ Create user if not exists
    user, created = User.objects.get_or_create(
        email=email,
        defaults={"phone": phone}
    )

    # Update phone if provided later
    if phone and user.phone != phone:
        user.phone = phone
        user.save()

    otp = generate_otp()

    EmailOTP.objects.create(
        email=email,
        otp=otp
    )

    try:
        send_mail(
            subject="Your OTP for Login",
            message=f"Your OTP is {otp}",
            from_email=None,
            recipient_list=[email],
            fail_silently=False
        )
    except Exception as e:
        return Response(
            {"error": "Email sending failed", "details": str(e)},
            status=500
        )

    return Response({
        "message": "OTP sent successfully",
        "user_created": created
    })


@api_view(["POST"])
def verify_email_otp(request):
    email = request.data.get("email")
    otp = request.data.get("otp")
    

    if not email or not otp:
        return Response(
            {"error": "Email and OTP required"},
            status=400
        )

    record = (
        EmailOTP.objects
        .filter(email=email, otp=otp)
        .order_by("-created_at")
        .first()
    )

    if not record:
        return Response({"error": "Invalid OTP"}, status=400)

    user = User.objects.get(email=email)
    user.is_verified = True
    user.save()

    return Response({
        "message": "Login successful",
        "user_id": user.id,
        "email": user.email,
        "role":user.role
    })
