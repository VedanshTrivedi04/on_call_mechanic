import os
import django

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from channels.auth import AuthMiddlewareStack
import core.routing

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mechanic_ai.settings")

django.setup()   # ⭐⭐⭐ VERY IMPORTANT ⭐⭐⭐

print("🔥 ASGI FILE LOADED 🔥")

application = ProtocolTypeRouter({
    "http": get_asgi_application(),

    "websocket": AuthMiddlewareStack(
        URLRouter(
            core.routing.websocket_urlpatterns
        )
    ),
})
