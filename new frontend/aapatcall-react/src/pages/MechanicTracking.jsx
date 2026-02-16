import { useEffect, useRef, useState, useContext } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import API, { WS_BASE } from "../api";
import "../styles/tracking.css";
import { AuthContext } from "../context/AuthContext";
import IncomingCallModal from "../components/IncomingCallModal";
import logo from "../assets/images/primary logo.png";

function MechanicTracking() {
  const { user } = useContext(AuthContext);
  const mapRef = useRef(null);
  const watchIdRef = useRef(null);
  const callSocketRef = useRef(null);

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  let bookingId = location.state?.bookingId;
  if (!bookingId) bookingId = searchParams.get("booking");
  bookingId = Number(bookingId);

  const [map, setMap] = useState(null);
  const [userMarker, setUserMarker] = useState(null);
  const [meMarker, setMeMarker] = useState(null);
  const [userPosition, setUserPosition] = useState(null); // { lat, lng } for "Open in Google Maps"
  const [incomingCall, setIncomingCall] = useState(null);
  const [callSocketReady, setCallSocketReady] = useState(false);
  const weSentStartCallRef = useRef(false);

  // ================= MAP LOAD =================
  useEffect(() => {
    if (!bookingId) return;

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
    script.defer = true;
    script.onload = initMap;
    script.onerror = () => console.warn("Google Maps script failed to load");
    document.body.appendChild(script);
  }, [bookingId]);

  const initMap = () => {
    if (!mapRef.current) return;

    const m = new window.google.maps.Map(mapRef.current, {
      center: { lat: 23.2, lng: 77.4 },
      zoom: 14,
    });

    setMap(m);
  };

  // ================= USER LOCATION WS =================
  useEffect(() => {
    if (!bookingId) return;

    const socket = new WebSocket(
      `${WS_BASE}/ws/tracking/${bookingId}/`
    );

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "LOCATION_UPDATE" && data.sender === "user") {
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);
        setUserPosition({ lat, lng });
        updateUserMarker(lat, lng);
      }
    };

    socket.onerror = () => console.log("Tracking WS error");
    socket.onclose = () => console.log("Tracking WS closed");

    return () => socket.close();
  }, [bookingId, map]);

  // ================= CALL SIGNALING =================
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
        // IMPORTANT: Preserve booking ID
        localStorage.setItem("runningBooking", bookingId);
        navigate(`/call?booking=${bookingId}&role=mechanic&caller=true`);
      } else if (data.type === "reject_call") {
        alert("Call rejected by user");
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
      return;
    }
    weSentStartCallRef.current = true;
    setTimeout(() => {
      weSentStartCallRef.current = false;
    }, 10000);
    callSocketRef.current.send(
      JSON.stringify({
        type: "start_call",
        sender: "mechanic",
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
    localStorage.setItem("runningBooking", bookingId);

    callSocketRef.current.send(
      JSON.stringify({
        type: "accept_call",
        sender: "mechanic",
      })
    );
    setIncomingCall(null);
    navigate(`/call?booking=${bookingId}&role=mechanic&caller=false`);
  };

  const handleRejectIncoming = () => {
    if (!bookingId || !callSocketRef.current) {
      setIncomingCall(null);
      return;
    }

    callSocketRef.current.send(
      JSON.stringify({
        type: "reject_call",
        sender: "mechanic",
      })
    );
    setIncomingCall(null);
  };

  const updateUserMarker = (lat, lng) => {
    if (!map) return;

    if (!userMarker) {
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map,
        label: "U",
      });
      setUserMarker(marker);
    } else {
      userMarker.setPosition({ lat, lng });
    }
  };

  // ================= SEND MECHANIC GPS =================
  useEffect(() => {
    if (!bookingId || !map) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        updateMyMarker(latitude, longitude);

        try {
          await API.post("tracking/update/", {
            booking_id: bookingId,
            latitude,
            longitude,
            sender: "mechanic",
          });
        } catch (err) {
          console.log("Location send failed");
        }
      },
      (err) => console.log("GPS error", err),
      { enableHighAccuracy: true }
    );

    return () => {
      if (watchIdRef.current)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [bookingId, map]);

  const updateMyMarker = (lat, lng) => {
    if (!map) return;

    if (!meMarker) {
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map,
        label: "M",
      });
      setMeMarker(marker);
    } else {
      meMarker.setPosition({ lat, lng });
    }
  };

  // ================= OPEN USER LOCATION IN GOOGLE MAPS =================
  const openUserLocationInMaps = () => {
    if (!userPosition) {
      alert("User location not available yet. Wait for the map to update.");
      return;
    }
    const { lat, lng } = userPosition;
    // Open Google Maps with directions to user (uses current location as origin on mobile)
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ================= STATUS BUTTONS =================
  const markArrived = async () => {
    if (!bookingId) return;

    try {
      await API.post("booking/status/", {
        booking_id: bookingId,
        status: "ON_SITE",
      });

      alert("You reached the customer");
    } catch (err) {
      console.error(err.response?.data);
      alert("Failed to update status");
    }
  };

  const completeJob = async () => {
    if (!bookingId) return;

    try {
      const res = await API.post("booking/status/", {
        booking_id: bookingId,
        status: "COMPLETED",
      });

      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      localStorage.removeItem("runningBooking");

      const fare = res.data?.fare;
      if (fare) {
        alert(`Job Completed Successfully. Fare: ₹${fare}`);
      } else {
        alert("Job Completed Successfully");
      }

      navigate("/mechanic");
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert("Failed to complete job");
    }
  };

  return (
    <div className="mechanic-tracking-page">
      <header className="navbar">
        <h2>Navigate to Customer</h2>
      </header>

      <div ref={mapRef} className="mechanic-tracking-map" />

      <div className="mechanic-tracking-sheet">
        <h3>Booking #{bookingId}</h3>
        <p className="sheet-subtitle">
          {userPosition
            ? "Customer location available — open in Maps or update status"
            : "Waiting for customer location…"}
        </p>

        <div className="mechanic-tracking-actions">
          <button
            type="button"
            className="mechanic-tracking-btn mechanic-tracking-btn-maps btn-full"
            onClick={openUserLocationInMaps}
            disabled={!userPosition}
            title={userPosition ? "Open in Google Maps" : "Waiting for user location…"}
          >
            📍 Open in Google Maps
          </button>
          <button
            type="button"
            className="mechanic-tracking-btn mechanic-tracking-btn-status"
            onClick={markArrived}
          >
            ✓ Reached User
          </button>
          <button
            type="button"
            className="mechanic-tracking-btn mechanic-tracking-btn-complete"
            onClick={completeJob}
          >
            ✓ Complete Work
          </button>
          <button
            type="button"
            className="mechanic-tracking-btn mechanic-tracking-btn-call"
            onClick={requestVideoCall}
            disabled={!callSocketReady}
            title={!callSocketReady ? "Connecting…" : "Video call"}
          >
            {callSocketReady ? "🎥 Video Call" : "🔄 Connecting…"}
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

export default MechanicTracking;
