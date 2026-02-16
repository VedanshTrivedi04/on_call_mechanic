import os

# Voice bot: OpenRouter (openai/gpt-oss-120b) for intelligent Hindi + English support
VOICE_BOT_API_KEY = os.getenv("VOICE_BOT_API_KEY")
VOICE_BOT_MODEL = os.getenv("VOICE_BOT_MODEL", "openai/gpt-oss-120b")

# Fallback: Groq for backward compatibility
try:
    from groq import Groq
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY")) if os.getenv("GROQ_API_KEY") else None
except Exception:
    groq_client = None

# OpenRouter client (OpenAI-compatible API)
def _get_voice_client():
    if not VOICE_BOT_API_KEY:
        return None
    try:
        from openai import OpenAI
        return OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=VOICE_BOT_API_KEY,
        )
    except Exception:
        return None


_openrouter_client = None

def _client():
    global _openrouter_client
    if _openrouter_client is None:
        _openrouter_client = _get_voice_client()
    return _openrouter_client


MAX_HISTORY = 8

# --------------------------------
# SYSTEM PROMPT – intelligent, Hindi + English
# --------------------------------
VOICE_SYSTEM_PROMPT = """You are an expert, friendly voice assistant for a roadside mechanic-on-call service in India. Your name is आपातCall Assistant.

**Your capabilities:**
- Answer questions about vehicles: car/bike not starting, battery, puncture, engine overheating, brakes, fuel, chain, etc.
- Give clear, short, practical advice (what to check, what to do safely while waiting).
- Help users book a mechanic: understand their problem and location, confirm when they say yes.
- Support both **Hindi** and **English** (Hinglish is fine). Match the user's language: if they speak in Hindi/Hinglish, reply in simple Hindi/Hinglish; if in English, reply in English.
- Keep replies concise and voice-friendly (1–3 sentences) so they are easy to listen to.

**Rules:**
- Be polite and reassuring, especially in breakdown situations.
- Do not repeat answers you already gave in this conversation.
- If the user asks something off-topic, briefly answer then guide back to vehicle help or booking.
- Never make up vehicle specifications or repair steps; if unsure, say so and suggest waiting for the mechanic.
"""


def ask_llm(user_question, language, conversation_history=None):
    """Intelligent reply using OpenRouter (gpt-oss-120b) or fallback to Groq. Supports Hindi and English."""
    client = _client()
    use_openrouter = client is not None

    system_prompt = VOICE_SYSTEM_PROMPT
    if language == "HINDI":
        system_prompt += "\n\nUser is speaking in Hindi/Hinglish. Reply in simple Hindi or Hinglish, keeping it short and clear for voice."
    else:
        system_prompt += "\n\nUser is speaking in English. Reply in clear, short English suitable for voice."

    messages = [{"role": "system", "content": system_prompt}]
    if conversation_history:
        for msg in conversation_history[-MAX_HISTORY:]:
            messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_question})

    if use_openrouter:
        try:
            completion = client.chat.completions.create(
                model=VOICE_BOT_MODEL,
                messages=messages,
                temperature=0.4,
                max_tokens=220,
            )
            return (completion.choices[0].message.content or "").strip()
        except Exception:
            pass

    if groq_client:
        try:
            completion = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                temperature=0.4,
                max_tokens=180,
            )
            return (completion.choices[0].message.content or "").strip()
        except Exception:
            pass

    return default_fallback(language)


# --------------------------------
# VEHICLE PROBLEM CLASSIFIER
# --------------------------------
CLASSIFY_PROMPT = """Classify the vehicle problem into exactly ONE of these categories: battery, engine, start, puncture, brake, chain, fuel, overheat, other.
User may write in Hindi, Hinglish, or English. Return ONLY the single category word, lowercase, no other text."""


def classify_vehicle_problem(user_text, language):
    """Classifies vehicle problem into a fixed category. Uses voice bot model when available."""
    client = _client()
    if client:
        try:
            completion = client.chat.completions.create(
                model=VOICE_BOT_MODEL,
                messages=[
                    {"role": "system", "content": CLASSIFY_PROMPT},
                    {"role": "user", "content": user_text},
                ],
                temperature=0,
                max_tokens=15,
            )
            category = (completion.choices[0].message.content or "").strip().lower().split()[0]
            allowed = {"battery", "engine", "start", "puncture", "brake", "chain", "fuel", "overheat", "other"}
            return category if category in allowed else "other"
        except Exception:
            pass

    if groq_client:
        try:
            completion = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": CLASSIFY_PROMPT},
                    {"role": "user", "content": user_text},
                ],
                temperature=0,
                max_tokens=10,
            )
            category = (completion.choices[0].message.content or "").strip().lower()
            allowed = {"battery", "engine", "start", "puncture", "brake", "chain", "fuel", "overheat", "other"}
            return category if category in allowed else "other"
        except Exception:
            pass

    return "other"


# --------------------------------
# FALLBACK RESPONSE (Hindi + English)
# --------------------------------
def default_fallback(language):
    if language == "HINDI":
        return (
            "Main aapki madad vehicle breakdown ke liye karta hoon. "
            "Kripya apni problem bataiye – Hindi ya English dono chalega."
        )
    return (
        "I'm here to help with vehicle breakdowns. "
        "Please tell me your issue in English or Hindi."
    )
