#!/usr/bin/env python
"""
Quick test for the voice AI (LLM + language + engine).
Run from mechanic_ai folder: python test_voice_ai.py
"""
import os
import sys
import django

# Load .env before Django
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
env_path = BASE_DIR / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mechanic_ai.settings")
django.setup()

from core.ai.language import detect_language
from core.ai.llm import ask_llm, classify_vehicle_problem, VOICE_BOT_API_KEY, VOICE_BOT_MODEL


def test_language():
    print("--- Language detection ---")
    tests = [
        "My car is not starting",
        "meri car start nahi ho rahi",
        "Battery dead hai",
        "What should I do if engine overheats?",
    ]
    for t in tests:
        lang = detect_language(t)
        print(f"  '{t[:40]}...' -> {lang}")
    print()


def test_classifier():
    print("--- Problem classifier ---")
    tests = [
        "car not starting",
        "battery khatam ho gayi",
        "puncture lag gaya",
    ]
    for t in tests:
        cat = classify_vehicle_problem(t, detect_language(t))
        print(f"  '{t}' -> {cat}")
    print()


def test_openrouter_direct():
    """One raw OpenRouter call to see success or error."""
    if not VOICE_BOT_API_KEY:
        print("--- OpenRouter: skip (no VOICE_BOT_API_KEY) ---\n")
        return
    print("--- OpenRouter direct call ---")
    try:
        from openai import OpenAI
        c = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=VOICE_BOT_API_KEY)
        r = c.chat.completions.create(
            model=VOICE_BOT_MODEL,
            messages=[{"role": "user", "content": "Say hello in one word."}],
            max_tokens=20,
        )
        msg = r.choices[0].message.content
        print(f"  OK: {msg}")
    except Exception as e:
        print(f"  OpenRouter error: {type(e).__name__}: {e}")
    print()


def test_llm():
    print("--- LLM (ask_llm) ---")
    if VOICE_BOT_API_KEY:
        print(f"  Using OpenRouter model: {VOICE_BOT_MODEL}")
    else:
        print("  VOICE_BOT_API_KEY not set, using Groq fallback if available")
    print()

    # English
    q1 = "What should I do if my car battery is dead?"
    lang1 = detect_language(q1)
    print(f"  Q (EN): {q1}")
    try:
        r1 = ask_llm(q1, lang1, conversation_history=None)
        print(f"  A: {r1[:300]}{'...' if len(r1) > 300 else ''}")
    except Exception as e:
        print(f"  Error: {type(e).__name__}: {e}")
    print()

    # Hindi/Hinglish
    q2 = "Meri bike start nahi ho rahi, kya karun?"
    lang2 = detect_language(q2)
    print(f"  Q (HI): {q2}")
    try:
        r2 = ask_llm(q2, lang2, conversation_history=None)
        print(f"  A: {r2[:300]}{'...' if len(r2) > 300 else ''}")
    except Exception as e:
        print(f"  Error: {type(e).__name__}: {e}")
    print()


def test_engine_flow():
    print("--- Engine flow (process_voice) ---")
    from core.ai.engine import process_voice
    session_id = "test_session_" + str(hash(os.urandom(4)) % 10000)
    # Simulate: user says problem
    r = process_voice("my car battery is dead", session_id, latitude=23.2, longitude=77.4)
    print(f"  Reply: {r.get('reply', '')[:200]}...")
    print(f"  booking_ready: {r.get('booking_ready', False)}")
    print()


if __name__ == "__main__":
    print("=== Voice AI test ===\n")
    test_language()
    test_classifier()
    test_openrouter_direct()
    test_llm()
    test_engine_flow()
    print("Done.")
