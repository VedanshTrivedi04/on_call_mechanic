from django.urls import re_path

from .consumers import (
    MechanicConsumer,
    BookingConsumer,
    VideoCallConsumer,
    TrackingConsumer,
    CallConsumer,
)
from .consumers_user import UserConsumer

websocket_urlpatterns = [
    re_path(r"ws/mechanic/(?P<mechanic_id>\d+)/$", MechanicConsumer.as_asgi()),
    re_path(r"ws/user/(?P<user_id>\d+)/$", UserConsumer.as_asgi()),
    re_path(r"ws/booking/(?P<booking_id>\d+)/$", BookingConsumer.as_asgi()),
    re_path(r"ws/video/(?P<booking_id>\d+)/$", VideoCallConsumer.as_asgi()),
    re_path(r"ws/tracking/(?P<booking_id>\d+)/$", TrackingConsumer.as_asgi()),
    re_path(r"ws/call/(?P<booking_id>\d+)/$", CallConsumer.as_asgi()),
]
