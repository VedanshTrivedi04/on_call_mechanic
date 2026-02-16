from rest_framework.decorators import api_view
from rest_framework.response import Response
from core.ai.engine import process_voice

@api_view(["POST"])
def voice_api(request):
    text = request.data.get("text")
    session_id = request.data.get("session_id")
    latitude = request.data.get("latitude")
    longitude = request.data.get("longitude")

    result = process_voice(text, session_id, latitude=latitude, longitude=longitude)
    return Response(result)
