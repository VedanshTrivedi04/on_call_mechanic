import requests
import os

HF_API_KEY = os.getenv("HF_API_KEY")

HEADERS = {
    "Authorization": f"Bearer {HF_API_KEY}"
}

TTS_MODELS = {
    "ENGLISH": "facebook/fastspeech2-en-ljspeech",
    "HINDI": "ai4bharat/indic-tts-hi"
}

def text_to_speech(text, language):
    model = TTS_MODELS.get(language, TTS_MODELS["ENGLISH"])
    url = f"https://api-inference.huggingface.co/models/{model}"

    response = requests.post(
        url,
        headers=HEADERS,
        json={"inputs": text},
        timeout=10  # 🔥 prevent hanging
    )

    if response.status_code != 200:
        return None

    return response.content