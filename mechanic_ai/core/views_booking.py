from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from core.models import Booking, Rating
from core.utils.fare import calculate_fare


@api_view(["POST"])
def update_booking_status(request):
    """
    Update the status of a booking and broadcast important milestones
    (like job completion) over websockets.
    """
    booking_id = request.data.get("booking_id")
    status = request.data.get("status")

    if not booking_id or not status:
        return Response({"error": "Missing data"}, status=400)

    try:
        booking = Booking.objects.get(id=booking_id)
    except Booking.DoesNotExist:
        return Response({"error": "Booking not found"}, status=404)

    # Update timestamps
    if status == "EN_ROUTE":
        # mechanic started moving towards user
        if not booking.started_at:
            booking.started_at = timezone.now()

    elif status == "ON_SITE":
        # mechanic reached the user; keep started_at if already set
        if not booking.started_at:
            booking.started_at = timezone.now()

    elif status == "COMPLETED":
        booking.completed_at = timezone.now()

        # Calculate fare using distance & time (simple model)
        distance_km = booking.distance_km or 0
        duration_minutes = 0
        if booking.started_at and booking.completed_at:
            duration_minutes = (booking.completed_at - booking.started_at).total_seconds() / 60

        booking.fare = calculate_fare(
            distance_km=distance_km,
            duration_minutes=duration_minutes,
        )

    booking.status = status
    booking.save()

    # Notify tracking consumers when job is completed
    if status == "COMPLETED":
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"tracking_{booking.id}",
            {
                "type": "job_completed",
                "payload": {
                    "type": "JOB_COMPLETED",
                    "message": "Service Completed",
                    "booking_id": booking.id,
                    "fare": float(booking.fare) if booking.fare is not None else None,
                },
            },
        )

    return Response(
        {
            "status": "updated",
            "booking_status": booking.status,
            "fare": float(booking.fare) if booking.fare is not None else None,
        }
    )


@api_view(["POST"])
def submit_feedback(request):
    """
    Submit feedback and rating for a completed booking.
    """
    booking_id = request.data.get("booking_id")
    rating = request.data.get("rating")
    feedback = request.data.get("feedback", "")

    if not booking_id or not rating:
        return Response({"error": "booking_id and rating are required"}, status=400)

    if rating < 1 or rating > 5:
        return Response({"error": "Rating must be between 1 and 5"}, status=400)

    try:
        booking = Booking.objects.get(id=booking_id)
    except Booking.DoesNotExist:
        return Response({"error": "Booking not found"}, status=404)

    if booking.status != "COMPLETED":
        return Response({"error": "Can only rate completed bookings"}, status=400)

    # Check if rating already exists
    existing_rating = Rating.objects.filter(booking=booking).first()
    if existing_rating:
        # Update existing rating
        existing_rating.rating = rating
        existing_rating.feedback = feedback[:500] if feedback else ""
        existing_rating.save()
        return Response({"status": "updated", "message": "Feedback updated successfully"})

    # Create new rating
    Rating.objects.create(
        booking=booking,
        rating=rating,
        feedback=feedback[:500] if feedback else "",
    )

    return Response({"status": "success", "message": "Feedback submitted successfully"})
