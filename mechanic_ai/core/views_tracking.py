from rest_framework.decorators import api_view
from rest_framework.response import Response
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from core.models import Booking

@api_view(["POST"])
def update_location(request):
    booking_id = request.data["booking_id"]
    lat = float(request.data["latitude"])
    lng = float(request.data["longitude"])
    sender = request.data["sender"]  # "user" or "mechanic"

    booking = Booking.objects.get(id=booking_id)

    # broadcast to other party
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"booking_{booking_id}",
        {
            "type": "location_update",
            "payload": {
                "sender": sender,
                "latitude": lat,
                "longitude": lng
            }
        }
    )

    return Response({"status": "location_updated"})
@api_view(["POST"])
def update_mechanic_location(request):

    booking_id = request.data.get("booking_id")
    lat = request.data.get("latitude")
    lng = request.data.get("longitude")

    if not booking_id:
        return Response({"error": "Missing booking id"}, status=400)

    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        f"tracking_{booking_id}",
        {
            "type": "tracking_message",
            "payload": {
                "type": "LOCATION_UPDATE",
                "latitude": lat,
                "longitude": lng
            }
        }
    )

    return Response({"status": "sent"})

@api_view(["POST"])
def update_tracking(request):

    booking_id = request.data.get("booking_id")
    lat = request.data.get("latitude")
    lng = request.data.get("longitude")
    sender = request.data.get("sender")  # "user" or "mechanic"

    if not booking_id or not lat or not lng:
        return Response({"error": "Missing data"}, status=400)

    try:
        booking = Booking.objects.get(id=booking_id)
    except Booking.DoesNotExist:
        return Response({"error": "Booking not found"}, status=404)

    # 🔥 BROADCAST LIVE LOCATION TO TRACKING ROOM
    channel_layer = get_channel_layer()

    payload = {
        "type": "LOCATION_UPDATE",
        "latitude": float(lat),
        "longitude": float(lng),
        "status": booking.status,
        "eta": "Calculating...",
        "sender": sender or "unknown",
    }

    async_to_sync(channel_layer.group_send)(
        f"tracking_{booking_id}",
        {
            # handled by TrackingConsumer.send_location
            "type": "send_location",
            "payload": payload,
        }
    )

    return Response({"status": "sent"})