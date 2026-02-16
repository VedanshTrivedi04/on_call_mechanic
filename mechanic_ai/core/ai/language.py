import re

# Common Hindi/Hinglish words (Roman script) – avoid generic English words like "car", "bike"
HINGLISH_INDICATORS = re.compile(
    r"\b(haan|nahi|nai|ho\s*raha|ho\s*rahi|ho\s*gaya|mera|meri|apni|aapki|kya|kyun|kaise|kripya|bataiye|batao|theek|sahi|bilkul|kardo|bhejo|samajh|madad|gadi|karo|karna|hai|hain|tha|thi)\b",
    re.IGNORECASE,
)

# Devanagari script (Hindi)
DEVANAGARI = re.compile(r"[\u0900-\u097F]")


def detect_language(text):
    """Detect if user is speaking in Hindi/Hinglish or English. Supports both script and Roman Hinglish."""
    if not text or not text.strip():
        return "ENGLISH"
    if DEVANAGARI.search(text):
        return "HINDI"
    if HINGLISH_INDICATORS.search(text):
        return "HINDI"
    return "ENGLISH"
