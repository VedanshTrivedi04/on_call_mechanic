import requests
import os

HF_API_KEY = os.getenv("HF_API_KEY")

API_URL = "https://api-inference.huggingface.co/models/openai/whisper-small"
HEADERS = {"Authorization": f"Bearer {HF_API_KEY}"}


def speech_to_text(audio_file):
    response = requests.post(
        API_URL,
        headers=HEADERS,
        data=audio_file.read()
    )

    if response.status_code != 200:
        return "Sorry, I could not understand the audio."

    result = response.json()

    if isinstance(result, dict) and "text" in result:
        return result["text"]

    return "Sorry, I could not understand the audio."
