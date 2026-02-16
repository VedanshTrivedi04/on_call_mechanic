import { useEffect, useRef, useState } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import "../styles/tracking.css";
import Navbar from "../components/Navbar";
import API, { WS_BASE } from "../api";
import IncomingCallModal from "../components/IncomingCallModal";

export default function LiveTracking() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const mechanicMarker = useRef(null);
  const callSocketRef = useRef(null);

  const [searchParams] = useSearchParams();
  const location = useLocation();

  const bookingId =
    searchParams.get("booking") ||
    location.state?.bookingId ||
    localStorage.getItem("activeBooking");

  const [userPos, setUserPos] = useState(null);
  const [mechanicPos, setMechanicPos] = useState(null);
  const [status, setStatus] = useState("WAITING");
  const [eta, setEta] = useState("--");
  const [mechanic, setMechanic] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callSocketReady, setCallSocketReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const weSentStartCallRef = useRef(false);

  useEffect(() => {
    if (bookingId) localStorage.setItem("activeBooking", bookingId);
  }, [bookingId]);

  // --------------- CALL SIGNALING ---------------
  useEffect(() => {
    if (!bookingId) return;

    const ws = new WebSocket(`${WS_BASE}/ws/call/${bookingId}/`);
    callSocketRef.current = ws;

    ws.onopen = () => {
      console.log("✅ Call WebSocket connected for booking", bookingId);
      setCallSocketReady(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📞 Call message:", data.type);

      // Only show incoming call popup if WE did not start the call (we are the receiver)
      if (data.type === "incoming_call") {
        if (weSentStartCallRef.current) return; // We are the caller, don't show our own "incoming" popup
        setIncomingCall({
          from: data.from,
          bookingId: data.booking_id,
        });
      } else if (data.type === "accept_call") {
        // Call accepted - navigate to video call page as caller
        // IMPORTANT: Preserve booking ID in URL and localStorage
        localStorage.setItem("activeBooking", bookingId);
        navigate(`/call?booking=${bookingId}&role=user&caller=true`);
      } else if (data.type === "reject_call") {
        alert("Call rejected by mechanic");
        setIncomingCall(null);
      }
    };

    ws.onerror = (error) => {
      console.error("Call WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("Call WebSocket closed");
      callSocketRef.current = null;
      setCallSocketReady(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      callSocketRef.current = null;
      setCallSocketReady(false);
    };
  }, [bookingId, navigate]);

  const requestVideoCall = () => {
    if (!bookingId || !callSocketRef.current) return;
    if (!callSocketReady || callSocketRef.current.readyState !== WebSocket.OPEN) {
      return; // Button is disabled, but guard anyway
    }
    weSentStartCallRef.current = true;
    setTimeout(() => {
      weSentStartCallRef.current = false;
    }, 10000);
    callSocketRef.current.send(
      JSON.stringify({
        type: "start_call",
        sender: "user",
      })
    );
  };

  const handleAcceptIncoming = () => {
    if (!bookingId || !callSocketRef.current) return;
    if (callSocketRef.current.readyState !== WebSocket.OPEN) {
      alert("Call connection not ready. Please try again.");
      return;
    }
    
    // IMPORTANT: Preserve booking ID
    localStorage.setItem("activeBooking", bookingId);
    
    callSocketRef.current.send(
      JSON.stringify({
        type: "accept_call",
        sender: "user",
      })
    );
    setIncomingCall(null);
    navigate(`/call?booking=${bookingId}&role=user&caller=false`);
  };

  const handleRejectIncoming = () => {
    if (!bookingId || !callSocketRef.current) {
      setIncomingCall(null);
      return;
    }
    callSocketRef.current.send(
      JSON.stringify({
        type: "reject_call",
        sender: "user",
      })
    );
    setIncomingCall(null);
  };

  // ===============================
  // 📍 Get User Location
  // ===============================
  useEffect(() => {
    if (!bookingId) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserPos({ lat, lng });
      },
      (err) => console.log("Location error", err)
    );
  }, [bookingId]);

  // ===============================
  // 🗺 Load Google Maps
  // ===============================
  useEffect(() => {
    if (!bookingId || !userPos) return;

    if (window.google) {
      initMap();
      return;
    }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      if (window.google) initMap();
      else existing.addEventListener("load", initMap);
      return () => existing.removeEventListener("load", initMap);
    }
    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js?key=AIzaSyAaHAE2MVl1Lrf48O0KJ7-L7MtXWkNgojY";
    script.async = true;
    script.onload = initMap;
    script.onerror = () => console.warn("Google Maps script failed to load");
    document.body.appendChild(script);
  }, [bookingId, userPos]);

  const initMap = () => {
    if (!window.google || !mapRef.current || !userPos) return;

    mapObj.current = new window.google.maps.Map(mapRef.current, {
      center: userPos,
      zoom: 15,
    });

    // Add user marker
    new window.google.maps.Marker({
      position: userPos,
      map: mapObj.current,
      label: "U",
    });

    setMapLoaded(true);
  };

  // ===============================
  // 📡 Send User Location to Backend
  // ===============================
  useEffect(() => {
    if (!bookingId) return;
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          await API.post("tracking/update/", {
            booking_id: bookingId,
            latitude,
            longitude,
            sender: "user",
          });
        } catch (err) {
          console.log("Failed to send user location", err);
        }
      },
      (err) => console.log("User GPS error", err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [bookingId]);

  // ===============================
  // 🔌 WebSocket Tracking
  // ===============================
  useEffect(() => {
    if (!bookingId) return;

    const ws = new WebSocket(`${WS_BASE}/ws/tracking/${bookingId}/`);

    ws.onopen = () => console.log("🟢 TRACKING SOCKET CONNECTED");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "MECHANIC_ASSIGNED") {
        setMechanic({
          name: data.mechanic_name,
          phone: data.mechanic_phone,
        });
        setStatus("MECHANIC ASSIGNED");
      }

      if (data.type === "NO_MECHANIC_ACCEPTED") {
        setStatus("WAITING");
        if (data.message) alert(data.message);
      }

      if (data.type === "LOCATION_UPDATE" && data.sender !== "user") {
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);
        setMechanicPos({ lat, lng });
        updateMechanicMarker(lat, lng);
        setStatus("ON THE WAY");

        // Calculate ETA
        if (userPos) {
          const distance = Math.sqrt(
            Math.pow(userPos.lat - lat, 2) + Math.pow(userPos.lng - lng, 2)
          );
          const minutes = Math.max(1, Math.floor(distance * 100));
          setEta(`${minutes} min`);
        }
      }

      if (data.type === "JOB_COMPLETED") {
        setStatus("COMPLETED");
        setEta("0 min");
        localStorage.removeItem("activeBooking");
        // Store booking info for feedback modal (mechanic ID will be fetched from booking)
        localStorage.setItem("completedBooking", JSON.stringify({
          bookingId: data.booking_id,
          fare: data.fare
        }));
        // Navigate to home after showing completion message
        setTimeout(() => {
          navigate("/user");
        }, 100);
      }
    };

    ws.onerror = () => console.log("❌ WS ERROR");
    ws.onclose = () => console.log("🔴 WS CLOSED");

    return () => ws.close();
  }, [bookingId, userPos]);

  const updateMechanicMarker = (lat, lng) => {
    if (!mapLoaded || !window.google || !mapObj.current) return;

    const pos = { lat, lng };

    if (!mechanicMarker.current) {
      mechanicMarker.current = new window.google.maps.Marker({
        position: pos,
        map: mapObj.current,
        label: "M",
      });
    } else {
      mechanicMarker.current.setPosition(pos);
    }

    mapObj.current.panTo(pos);
  };

  // ===============================
  // 📞 Call Mechanic
  // ===============================
  const callMechanic = () => {
    if (!mechanic?.phone) return;
    window.location.href = `tel:${mechanic.phone}`;
  };

  // ===============================
  // ❌ Cancel Request
  // ===============================
  const cancelRequest = async () => {
    if (!window.confirm("Are you sure you want to cancel this request?")) {
      return;
    }

    if (!bookingId) {
      navigate("/user");
      return;
    }

    try {
      await API.post("booking/status/", {
        booking_id: bookingId,
        status: "CANCELLED",
      });

      localStorage.removeItem("activeBooking");
      alert("Request cancelled successfully");
      navigate("/user");
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert("Failed to cancel request. Please try again.");
    }
  };

  return (
    <div className="tracking-container">
      {/* NAVBAR */}
      <Navbar />

      {/* GOOGLE MAP */}
      <div ref={mapRef} style={{ width: "100%", height: "100vh" }} />

      {!mapLoaded && (
        <div style={{ padding: 20, textAlign: "center" }}>
          ⚠ Loading map...
        </div>
      )}

      {/* STATUS CARD */}
      <div className="status-card">
        <h3>Mechanic Status</h3>

        <p className="status">
          Status: <span>{status}</span>
        </p>

        <p className="eta">
          ETA: <span>{eta}</span>
        </p>

        {mechanic && (
          <div style={{ marginTop: 12 }}>
            <p>
              <strong>{mechanic.name}</strong>
            </p>
            <p style={{ fontSize: 12, color: "#666" }}>{mechanic.phone}</p>
          </div>
        )}

        <div className="actions">
          {mechanic && (
            <>
              <button className="call-btn" onClick={callMechanic}>
                📞 Call Mechanic
              </button>
              <button
                className="call-btn"
                onClick={requestVideoCall}
                disabled={!callSocketReady}
                title={!callSocketReady ? "Connecting..." : "Start video call"}
              >
                {callSocketReady ? "🎥 Video Call" : "🔄 Connecting..."}
              </button>
            </>
          )}
          <button className="cancel-btn" onClick={cancelRequest}>
            Cancel Request
          </button>
        </div>
      </div>

      <IncomingCallModal
        visible={!!incomingCall}
        from={incomingCall?.from}
        bookingId={incomingCall?.bookingId}
        onAccept={handleAcceptIncoming}
        onReject={handleRejectIncoming}
      />
    </div>
  );
}
