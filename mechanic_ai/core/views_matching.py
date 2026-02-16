from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from core.models import User, Booking, ServiceRequest, Mechanic, VoiceSession
import math


def _distance_km(lat1, lng1, lat2, lng2):
    """Approximate distance in km (Haversine)."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def find_nearby_mechanics_ordered(lat, lng, vehicle_type=None):
    """
    Return list of available mechanics sorted by distance (nearest first).
    Used for one-by-one Uber/Ola style request flow.
    """
    qs = Mechanic.objects.filter(is_available=True)
    if vehicle_type:
        qs = qs.filter(vehicle_type=vehicle_type)
    mechanics = list(qs)
    # Sort by distance; mechanics without lat/lng go to end
    def sort_key(m):
        if m.latitude is None or m.longitude is None:
            return float("inf")
        return _distance_km(float(lat), float(lng), m.latitude, m.longitude)
    mechanics.sort(key=sort_key)
    return mechanics


@api_view(["POST"])
def create_service_request(request):
    user_id = request.data.get("user_id")
    latitude = request.data.get("latitude")
    longitude = request.data.get("longitude")
    problem = request.data.get("problem", "")
    location_text = request.data.get("location_text", "")
    vehicle_type = request.data.get("vehicle_type")  # "2W" / "4W" / "EV"

    if not user_id or not latitude or not longitude:
        return Response({"error": "Missing required fields"}, status=400)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    # Create Booking
    booking = Booking.objects.create(
        user=user,
        problem=problem,
        location_text=location_text,
        latitude=float(latitude),
        longitude=float(longitude),
        status="PENDING",
    )

    # Create ServiceRequest
    service_request = ServiceRequest.objects.create(
        user=user,
        booking=booking,
        expires_at=timezone.now() + timezone.timedelta(seconds=40),
    )

    # 🔥 One-by-one (Uber/Ola): nearest mechanic first, 4–5 sec per mechanic
    nearby_mechanics = find_nearby_mechanics_ordered(
        float(latitude),
        float(longitude),
        vehicle_type=vehicle_type,
    )
    mechanic_ids = [m.id for m in nearby_mechanics]

    service_request.mechanic_queue = mechanic_ids
    service_request.current_index = 0
    service_request.save()

    print("USER LAT/LNG:", latitude, longitude)
    print("NEARBY MECHANICS (ordered):", mechanic_ids)

    channel_layer = get_channel_layer()
    payload = {
        "type": "NEW_REQUEST",
        "request_id": service_request.id,
        "booking_id": booking.id,
        "problem": problem,
        "latitude": latitude,
        "longitude": longitude,
        "vehicle_type": vehicle_type,
    }

    # Send only to the first (nearest) mechanic
    if mechanic_ids:
        first_mechanic_id = mechanic_ids[0]
        print("🚀 Sending to first mechanic:", first_mechanic_id)
        async_to_sync(channel_layer.group_send)(
            f"mechanic_{first_mechanic_id}",
            {"type": "send_request", "payload": payload},
        )

    return Response(
        {
            "status": "sent_to_first",
            "request_id": service_request.id,
            "booking_id": booking.id,
            "nearby_count": len(mechanic_ids),
        }
    )


@api_view(["POST"])
def voice_confirm_booking(request):
    """
    Create a booking from a voice assistant session.
    Called when user confirms in assistant (session has problem + location).
    """
    session_id = request.data.get("session_id")
    user_id = request.data.get("user_id")
    latitude = request.data.get("latitude")
    longitude = request.data.get("longitude")
    vehicle_type = request.data.get("vehicle_type", "4W")

    if not session_id or not user_id or latitude is None or longitude is None:
        return Response({"error": "Missing required fields: session_id, user_id, latitude, longitude"}, status=400)

    try:
        voice_session = VoiceSession.objects.get(session_id=session_id)
        user = User.objects.get(id=user_id)
    except VoiceSession.DoesNotExist:
        return Response({"error": "Voice session not found"}, status=404)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    problem = voice_session.problem or "other"
    location_text = voice_session.location or ""

    booking = Booking.objects.create(
        user=user,
        problem=problem,
        location_text=location_text,
        latitude=float(latitude),
        longitude=float(longitude),
        status="PENDING",
    )

    service_request = ServiceRequest.objects.create(
        user=user,
        booking=booking,
        expires_at=timezone.now() + timezone.timedelta(seconds=40),
    )

    nearby_mechanics = find_nearby_mechanics_ordered(
        float(latitude),
        float(longitude),
        vehicle_type=vehicle_type,
    )
    mechanic_ids = [m.id for m in nearby_mechanics]
    service_request.mechanic_queue = mechanic_ids
    service_request.current_index = 0
    service_request.save()

    channel_layer = get_channel_layer()
    payload = {
        "type": "NEW_REQUEST",
        "request_id": service_request.id,
        "booking_id": booking.id,
        "problem": problem,
        "latitude": latitude,
        "longitude": longitude,
        "vehicle_type": vehicle_type,
    }
    if mechanic_ids:
        async_to_sync(channel_layer.group_send)(
            f"mechanic_{mechanic_ids[0]}",
            {"type": "send_request", "payload": payload},
        )

    return Response(
        {
            "status": "sent_to_first",
            "booking_id": booking.id,
            "request_id": service_request.id,
            "nearby_count": len(mechanic_ids),
        }
    )
