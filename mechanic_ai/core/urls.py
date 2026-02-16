from django.urls import path
from .views import voice_api
from .views_auth import send_email_otp, verify_email_otp
from .views_matching import create_service_request, voice_confirm_booking
from .views_mechanic import (
    update_mechanic_status,
    mechanic_accept,
    mechanic_decline,
    get_mechanic_id,
    mechanic_stats,
    mechanic_jobs,
)
from .views_user import user_bookings, get_services
from .views_tracking import update_tracking
from .views_booking import update_booking_status, submit_feedback

urlpatterns = [

    # AI Voice
    path("voice/", voice_api),
    path("voice/confirm-booking/", voice_confirm_booking),

    # Authentication
    path("auth/send-otp/", send_email_otp),
    path("auth/verify-otp/", verify_email_otp),

    # Service Request
    path("request/create/", create_service_request),

    # Mechanic
    path("mechanic/status/", update_mechanic_status),
    path("mechanic/accept/", mechanic_accept),
    path("mechanic/decline/", mechanic_decline),
    path("mechanic/get-id/<int:user_id>/", get_mechanic_id),
    path("mechanic/stats/", mechanic_stats),
    path("mechanic/jobs/", mechanic_jobs),

    # User
    path("user/bookings/", user_bookings),
    path("services/", get_services),

    # Tracking (LIVE LOCATION)
    path("tracking/update/", update_tracking),

    # Booking Status
    path("booking/status/", update_booking_status),
    path("booking/feedback/", submit_feedback),
]
