import { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../api";
import { AuthContext } from "../context/AuthContext";
import "../styles/assistant.css";

const SpeechRecognition =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

function generateSessionId() {
  return "va_" + Date.now() + "_" + Math.random().toString(36).slice(2, 11);
}

export default function VoiceAssistant() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [sessionId] = useState(() => generateSessionId());
  const [status, setStatus] = useState("idle"); // idle | listening | processing
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);
  const [locationError, setLocationError] = useState("");
  const recognitionRef = useRef(null);
  const statusRef = useRef("idle");

  // Get location automatically on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Location not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => setLocationError("Allow location for booking"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const speak = (text) => {
    if (!text || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1;
    u.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const en = voices.find((v) => v.lang.startsWith("en"));
    if (en) u.voice = en;
    window.speechSynthesis.speak(u);
  };

  const sendToAssistant = async (textToSend) => {
    const trimmed = String(textToSend || "").trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setStatus("processing");

    const payload = {
      text: trimmed,
      session_id: sessionId,
    };
    if (coords) {
      payload.latitude = coords.latitude;
      payload.longitude = coords.longitude;
    }

    try {
      const res = await API.post("voice/", payload);
      const reply = res.data.reply || "Something went wrong.";
      const bookingReady = res.data.booking_ready === true;

      speak(reply);

      if (bookingReady && user?.id) {
        if (!coords) {
          speak("Please allow location access and try again.");
          setLoading(false);
          setStatus("idle");
          return;
        }
        try {
          const bookRes = await API.post("voice/confirm-booking/", {
            session_id: sessionId,
            user_id: user.id,
            latitude: coords.latitude,
            longitude: coords.longitude,
            vehicle_type: "4W",
          });
          const bookingId = bookRes.data.booking_id;
          if (bookingId) {
            localStorage.setItem("activeBooking", String(bookingId));
            speak("Booking created. Taking you to tracking.");
            setTimeout(() => navigate(`/tracking?booking=${bookingId}`), 2500);
          }
        } catch (err) {
          const errMsg = err.response?.data?.error || "Failed to create booking.";
          speak("Sorry, " + errMsg);
        }
      }
    } catch (err) {
      speak("Could not reach the assistant. Check your connection.");
    } finally {
      setLoading(false);
      setStatus("idle");
    }
  };

  const startListening = () => {
    if (!SpeechRecognition || loading) return;
    const Recognition = SpeechRecognition;
    const rec = new Recognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-IN";

    rec.onstart = () => setStatus("listening");
    rec.onend = () => {
      if (statusRef.current === "listening") setStatus("idle");
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") {
        setStatus("idle");
        speak("Microphone access was denied. Please allow mic and try again.");
      }
      setStatus("idle");
    };
    rec.onresult = (e) => {
      let final = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i];
        if (t.isFinal) final += t[0].transcript;
      }
      if (final.trim()) {
        try {
          rec.abort();
        } catch (_) {}
        setStatus("idle");
        sendToAssistant(final.trim());
      }
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setStatus("idle");
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  statusRef.current = status;
  const isListening = status === "listening";
  const isProcessing = loading || status === "processing";

  return (
    <div className="assistant-page">
      <Navbar />
      <main className="assistant-main voice-main">
        <div className="assistant-header">
          <h1>🛠️ Voice Assistant</h1>
          <p>Tap the mic and speak your vehicle problem. Your location is used automatically.</p>
          {locationError && <p className="location-warn">{locationError}</p>}
          {coords && <p className="location-ok">📍 Location ready</p>}
        </div>

        <div className="voice-container">
          <button
            type="button"
            className={`mic-btn ${isListening ? "listening" : ""} ${isProcessing ? "processing" : ""}`}
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing && !isListening}
            aria-label={isListening ? "Stop listening" : "Start voice input"}
          >
            <span className="mic-icon">{isListening ? "⏹" : "🎤"}</span>
            <span className="mic-label">
              {isListening ? "Listening…" : isProcessing ? "Processing…" : "Tap to speak"}
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}
