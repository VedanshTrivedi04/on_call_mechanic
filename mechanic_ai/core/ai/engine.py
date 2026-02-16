from core.models import VoiceSession, ConversationMessage
from .extractor import extract_problem, extract_location
from .llm import classify_vehicle_problem, ask_llm
from .language import detect_language
from .intent import detect_intent


def _is_confirm_intent(text):
    """Check if user is saying yes/confirm to book mechanic."""
    t = text.lower().strip()
    confirm = ["yes", "yeah", "haan", "ha", "ji", "confirm", "book", "karo",
               "theek", "ok", "okay", "sahi", "bilkul", "kardo", "bhejo", "call"]
    words = set(t.split())
    return any(c in words or c in t for c in confirm) and len(words) <= 5


def process_voice(text, session_id, latitude=None, longitude=None):
    language = detect_language(text)
    intent = detect_intent(text)
    has_coords = latitude is not None and longitude is not None

    session, _ = VoiceSession.objects.get_or_create(
        session_id=session_id
    )

    # 🔹 SAVE USER MESSAGE (MEMORY)
    ConversationMessage.objects.create(
        session=session,
        role="user",
        content=text
    )

    # ---------- STATE: START ----------
    if session.state == "START":
        session.state = "ASK_PROBLEM"
        session.save()

        reply = (
            "Aapko kya problem aa rahi hai?"
            if language == "HINDI"
            else "What problem are you facing?"
        )

        ConversationMessage.objects.create(
            session=session,
            role="assistant",
            content=reply
        )

        return {"reply": reply, "language": language}

    # ---------- STATE: ASK_PROBLEM ----------
    if session.state == "ASK_PROBLEM":
        problem = extract_problem(text)

        if not problem:
            problem = classify_vehicle_problem(text, language)

        if problem == "other":
            reply = (
                "Kripya engine, battery, puncture ya start issue bataiye."
                if language == "HINDI"
                else "Please tell if it is engine, battery, puncture or start issue."
            )

            ConversationMessage.objects.create(
                session=session,
                role="assistant",
                content=reply
            )

            return {"reply": reply, "language": language}

        session.problem = problem
        # If we have coords from app, skip asking location and go straight to READY_TO_MATCH
        if has_coords:
            session.location = "Current location"
            session.latitude = float(latitude)
            session.longitude = float(longitude)
            session.state = "READY_TO_MATCH"
            session.save()
            reply = (
                "Got it 👍 I have your location. Finding a nearby mechanic."
                if language == "HINDI"
                else "Got it 👍 I have your location. Finding a nearby mechanic."
            )
        else:
            session.state = "ASK_LOCATION"
            session.save()
            reply = (
                "Got it 👍 Please tell your location."
                if language == "HINDI"
                else "Got it 👍 Please tell your location."
            )

        ConversationMessage.objects.create(
            session=session,
            role="assistant",
            content=reply
        )
        return {"reply": reply, "language": language}

    # ---------- STATE: ASK_LOCATION ----------
    if session.state == "ASK_LOCATION":
        # Use provided coords if available (e.g. from browser geolocation)
        if has_coords:
            session.location = "Current location"
            session.latitude = float(latitude)
            session.longitude = float(longitude)
            session.state = "READY_TO_MATCH"
            session.save()
            reply = (
                "Location mil gayi 👍 Main nearby mechanic dhoondh raha hoon."
                if language == "HINDI"
                else "Location received 👍 Finding a nearby mechanic."
            )
        else:
            location = extract_location(text)
            if not location:
                reply = (
                    "Kripya apni location thoda clearly batayiye."
                    if language == "HINDI"
                    else "Please tell your location clearly."
                )
                ConversationMessage.objects.create(
                    session=session,
                    role="assistant",
                    content=reply
                )
                return {"reply": reply, "language": language}

            session.location = location
            session.state = "READY_TO_MATCH"
            session.save()
            reply = (
                f"Location mil gayi 👍 {location}. Main nearby mechanic dhoondh raha hoon."
                if language == "HINDI"
                else f"Location received 👍 {location}. Finding a nearby mechanic."
            )

        ConversationMessage.objects.create(
            session=session,
            role="assistant",
            content=reply
        )

        return {"reply": reply, "language": language}

    # ---------- STATE: READY_TO_MATCH ----------
    if session.state == "READY_TO_MATCH":
        if _is_confirm_intent(text):
            reply = (
                "Theek hai! Ab aap apni location allow karein, main request bhej raha hoon."
                if language == "HINDI"
                else "Sure! Please allow location — I'm creating your request now."
            )
            ConversationMessage.objects.create(
                session=session,
                role="assistant",
                content=reply
            )
            return {"reply": reply, "language": language, "booking_ready": True}

        reply = (
            "Main aapke liye mechanic connect kar sakta hoon. Call karein? Ha bolein to request bhej dunga."
            if language == "HINDI"
            else "I can connect you with a mechanic. Say yes to book."
        )
        ConversationMessage.objects.create(
            session=session,
            role="assistant",
            content=reply
        )
        return {"reply": reply, "language": language}

    # ---------- LLM FALLBACK WITH MEMORY ----------
    history_qs = (
        ConversationMessage.objects
        .filter(session=session)
        .order_by("created_at")
        .values("role", "content")
    )

    conversation_history = [
        {"role": h["role"], "content": h["content"]}
        for h in history_qs
    ]

    reply = ask_llm(text, language, conversation_history)

    ConversationMessage.objects.create(
        session=session,
        role="assistant",
        content=reply
    )

    return {"reply": reply, "language": language}
