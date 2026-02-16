from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from datetime import timedelta

from core.models import Mechanic, ServiceRequest, Booking

@api_view(["POST"])
def update_mechanic_status(request):
    user_id = request.data.get("mechanic_id")
    is_available = request.data.get("is_available")
    latitude = request.data.get("latitude")
    longitude = request.data.get("longitude")

    try:
        mechanic = Mechanic.objects.get(user_id=user_id)
    except Mechanic.DoesNotExist:
        return Response({"error": "Mechanic not found"}, status=404)

    mechanic.is_available = is_available
    mechanic.latitude = latitude
    mechanic.longitude = longitude
    mechanic.last_seen = timezone.now()
    mechanic.save()

    return Response({
        "status": "updated",
        "mechanic_id": mechanic.id
    })



@api_view(["POST"])
def mechanic_accept(request):

    mechanic_id = request.data.get("mechanic_id")
    request_id = request.data.get("request_id")

    try:
        mechanic = Mechanic.objects.get(id=mechanic_id)
    except Mechanic.DoesNotExist:
        return Response({"error": "Mechanic not found"}, status=404)

    try:
        service_request = ServiceRequest.objects.select_related("booking", "user").get(id=request_id)

        if service_request.claimed_by:
            return Response({"error": "Already taken"}, status=400)

        # assign mechanic
        service_request.claimed_by = mechanic
        service_request.claimed_at = timezone.now()
        service_request.save()

        booking = service_request.booking
        booking.mechanic = mechanic
        booking.status = "ACCEPTED"
        booking.accepted_at = timezone.now()
        booking.save()

    except ServiceRequest.DoesNotExist:
        return Response({"error": "Request not found"}, status=404)

    # 🔥 SEND DATA TO USER
    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        f"tracking_{booking.id}",
        {
            "type": "tracking_message",
            "payload": {
                "type": "MECHANIC_ASSIGNED",
                "booking_id": booking.id,
                "mechanic_name": mechanic.name,
                "mechanic_phone": mechanic.phone,
                "latitude": mechanic.latitude,
                "longitude": mechanic.longitude,
            }
        }
    )

    return Response({
        "status": "accepted",
        "booking_id": booking.id
    })


@api_view(["POST"])
def mechanic_decline(request):
    """
    Mechanic declined or timed out (4–5 sec). Transfer request to next nearest mechanic.
    """
    request_id = request.data.get("request_id")
    mechanic_id = request.data.get("mechanic_id")

    if not request_id or not mechanic_id:
        return Response({"error": "request_id and mechanic_id required"}, status=400)

    try:
        service_request = ServiceRequest.objects.get(id=request_id)
    except ServiceRequest.DoesNotExist:
        return Response({"error": "Request not found"}, status=404)

    if service_request.claimed_by_id:
        return Response({"status": "already_accepted"}, status=200)

    queue = service_request.mechanic_queue or []
    idx = service_request.current_index
    if idx < 0 or idx >= len(queue) or queue[idx] != mechanic_id:
        return Response({"status": "declined", "transferred_to_next": False})

    service_request.current_index = idx + 1
    service_request.save(update_fields=["current_index"])

    channel_layer = get_channel_layer()
    payload = {
        "type": "NEW_REQUEST",
        "request_id": service_request.id,
        "booking_id": service_request.booking.id,
        "problem": service_request.booking.problem or "",
        "latitude": service_request.booking.latitude,
        "longitude": service_request.booking.longitude,
        "vehicle_type": None,
    }

    if service_request.current_index < len(queue):
        next_mechanic_id = queue[service_request.current_index]
        async_to_sync(channel_layer.group_send)(
            f"mechanic_{next_mechanic_id}",
            {"type": "send_request", "payload": payload},
        )
        return Response({"status": "declined", "transferred_to_next": True})
    else:
        # No more mechanics – optionally notify user
        async_to_sync(channel_layer.group_send)(
            f"tracking_{service_request.booking_id}",
            {
                "type": "tracking_message",
                "payload": {
                    "type": "NO_MECHANIC_ACCEPTED",
                    "message": "No mechanic accepted yet. You can try again.",
                },
            },
        )
        return Response({"status": "declined", "transferred_to_next": False})


@api_view(["GET"])
def get_mechanic_id(request, user_id):
    try:
        mechanic = Mechanic.objects.get(user_id=user_id)
        return Response({"mechanic_id": mechanic.id})
    except Mechanic.DoesNotExist:
        return Response({"error": "Mechanic not found"}, status=404)


@api_view(["GET"])
def mechanic_stats(request):
    """Today's earnings, this week earnings, total jobs count for a mechanic."""
    user_id = request.query_params.get("user_id")
    if not user_id:
        return Response({"error": "user_id required"}, status=400)
    try:
        mechanic = Mechanic.objects.get(user_id=user_id)
    except Mechanic.DoesNotExist:
        return Response({"error": "Mechanic not found"}, status=404)

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())

    completed = Booking.objects.filter(mechanic=mechanic, status="COMPLETED")

    today_earnings = completed.filter(
        completed_at__gte=today_start,
        completed_at__lte=now,
    ).aggregate(s=Sum("fare"))["s"] or 0

    week_earnings = completed.filter(
        completed_at__gte=week_start,
        completed_at__lte=now,
    ).aggregate(s=Sum("fare"))["s"] or 0

    total_jobs = Booking.objects.filter(mechanic=mechanic).exclude(
        status="CANCELLED"
    ).count()

    return Response({
        "today_earnings": float(today_earnings),
        "week_earnings": float(week_earnings),
        "total_jobs": total_jobs,
    })


@api_view(["GET"])
def mechanic_jobs(request):
    """List all jobs (bookings) for a mechanic, most recent first."""
    user_id = request.query_params.get("user_id")
    if not user_id:
        return Response({"error": "user_id required"}, status=400)
    try:
        mechanic = Mechanic.objects.get(user_id=user_id)
    except Mechanic.DoesNotExist:
        return Response({"error": "Mechanic not found"}, status=404)

    jobs = (
        Booking.objects.filter(mechanic=mechanic)
        .order_by("-requested_at")
        .values(
            "id",
            "problem",
            "location_text",
            "status",
            "fare",
            "requested_at",
            "completed_at",
            "distance_km",
        )
    )
    list_jobs = []
    for j in jobs:
        list_jobs.append({
            "id": j["id"],
            "problem": j["problem"] or "—",
            "location_text": j["location_text"] or "—",
            "status": j["status"],
            "fare": float(j["fare"]) if j["fare"] is not None else None,
            "requested_at": j["requested_at"].isoformat() if j["requested_at"] else None,
            "completed_at": j["completed_at"].isoformat() if j["completed_at"] else None,
            "distance_km": j["distance_km"],
        })
    return Response({"jobs": list_jobs})
