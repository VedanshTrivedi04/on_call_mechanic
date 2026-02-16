def detect_intent(text):
    text = text.lower()

    system_keywords = [
        "mechanic", "call", "connect", "near",
        "location", "breakdown", "puncture",
        "start nahi", "band"
    ]

    info_keywords = [
        "why", "what", "how", "kaise",
        "kyun", "kya", "explain", "reason"
    ]

    if any(word in text for word in system_keywords):
        return "SYSTEM"

    if any(word in text for word in info_keywords):
        return "INFO"

    if any(word in text for word in ["hello", "hi", "namaste"]):
        return "GREETING"

    # Confirm / yes for booking
    confirm_keywords = [
        "yes", "yeah", "haan", "ha", "ji", "confirm", "book", "karo",
        "theek", "ok", "okay", "sahi", "bilkul", "kardo", "bhejo"
    ]
    if any(word in text for word in confirm_keywords) and len(text.split()) <= 4:
        return "CONFIRM"

    return "GENERAL"
