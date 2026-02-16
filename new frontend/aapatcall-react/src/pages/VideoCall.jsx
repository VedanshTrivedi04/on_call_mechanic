import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { WS_BASE } from "../api";
import "../styles/style.css";
import "./VideoCall.css";

function VideoCall() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const bookingId =
    searchParams.get("booking") ||
    localStorage.getItem("activeBooking") ||
    localStorage.getItem("runningBooking");
  const role = searchParams.get("role") || "user";
  const isCaller = searchParams.get("caller") === "true";

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const wsRef = useRef(null);
  const localStreamRef = useRef(null);
  const callAcceptedRef = useRef(isCaller);

  const [callActive, setCallActive] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  // Caller lands here only after receiver accepted (navigated from tracking), so call is already accepted
  const [callAccepted, setCallAccepted] = useState(isCaller);
  const [status, setStatus] = useState("Connecting...");

  callAcceptedRef.current = callAccepted;

  const cleanupMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current?.srcObject) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const navigateBackToTracking = () => {
    // TRACKING PAGE FIX: Do NOT clear localStorage.activeBooking / runningBooking on call end.
    // Only navigate back; booking is removed only when job is completed (JOB_COMPLETED / completeJob).
    if (role === "mechanic") {
      navigate(`/mechanic/tracking?booking=${bookingId}`);
    } else {
      navigate(`/tracking?booking=${bookingId}`);
    }
  };

  const endCall = useCallback((sendSignal = true, navigateBack = false) => {
    if (sendSignal && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(
          JSON.stringify({
            type: "end_call",
            sender: role,
          })
        );
      } catch (err) {
        console.error("Error sending end_call", err);
      }
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    cleanupMedia();
    setCallActive(false);
    setCallAccepted(false);
    setStatus("Call ended");

    if (navigateBack) {
      // Small delay to ensure cleanup completes
      setTimeout(() => {
        navigateBackToTracking();
      }, 500);
    }
  }, [role, bookingId, navigate]);

  // ---------- WebSocket for signaling ----------
  useEffect(() => {
    if (!bookingId) {
      setStatus("Missing booking ID");
      return;
    }

    const wsUrl = `${WS_BASE}/ws/call/${bookingId}/`;
    console.log("[CALL] Opening WebSocket:", wsUrl, "bookingId:", bookingId);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    const wsInstance = ws; // capture for cleanup so we close the right instance

    ws.onopen = () => {
      console.log("[CALL] WebSocket connected, readyState:", ws.readyState);
      setSocketReady(true);
      setStatus(isCaller ? "Ready to call" : "Waiting for call...");
    };

    ws.onmessage = async (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        console.error("[CALL] Invalid JSON from server:", event.data);
        return;
      }
      console.log("[CALL] Received:", data.type, "sender:", data.sender);

      // Handle accept_call - call has been accepted, can start WebRTC
      if (data.type === "accept_call") {
        setCallAccepted(true);
        setStatus("Call accepted - starting video...");
        // If we're the caller and already have media, send offer
        if (isCaller && localStreamRef.current && pcRef.current) {
          await sendOffer();
        }
        return;
      }

      // Handle reject_call
      if (data.type === "reject_call") {
        setStatus("Call rejected");
        alert("Call was rejected");
        setTimeout(() => {
          navigateBackToTracking();
        }, 2000);
        return;
      }

      // Handle end_call
      if (data.type === "end_call") {
        setStatus("Call ended by other party");
        endCall(false, true);
        return;
      }

      // WebRTC signaling - only process if call is accepted (ref avoids effect re-run)
      if (!callAcceptedRef.current && data.type !== "incoming_call") {
        return;
      }

      const pc = pcRef.current;

      // Ensure peer connection exists for WebRTC messages
      if (!pc && (data.type === "offer" || data.type === "answer")) {
        await ensurePeerConnection();
      }

      const peer = pcRef.current;
      if (!peer) return;

      try {
        if (data.type === "offer" && data.sdp) {
          // Receiver: got offer, create answer
          setStatus("Receiving call...");
          await peer.setRemoteDescription(
            new RTCSessionDescription(data.sdp)
          );
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "answer", sdp: answer, sender: role }));
            console.log("[CALL] Sent answer");
          } else {
            console.warn("[CALL] Cannot send answer, ws not open:", ws.readyState);
          }
          setCallActive(true);
          setStatus("Call connected");
        } else if (data.type === "answer" && data.sdp) {
          // Caller: remote accepted our offer and sent answer
          await peer.setRemoteDescription(
            new RTCSessionDescription(data.sdp)
          );
          setCallActive(true);
          setStatus("Call connected");
        } else if (data.type === "ice-candidate" && data.candidate) {
          // Add ICE candidate
          try {
            await peer.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
          } catch (err) {
            // Ignore duplicate/old candidates
            console.log("ICE candidate error (can ignore):", err);
          }
        }
      } catch (err) {
        console.error("Error handling signaling message", err);
        setStatus(`Error: ${err.message}`);
      }
    };

    ws.onerror = (error) => {
      console.error("[CALL] WebSocket error:", error, "readyState:", ws.readyState);
      setStatus("Connection error");
    };

    ws.onclose = (event) => {
      console.log("[CALL] WebSocket closed, code:", event.code, "reason:", event.reason, "wasClean:", event.wasClean);
      setSocketReady(false);
      if (wsRef.current === wsInstance) {
        wsRef.current = null;
      }
    };

    // Defer close so React Strict Mode's double-mount doesn't kill the connection.
    // Cleanup runs on "unmount", then effect re-runs on remount. Closing immediately
    // would kill the first connection; delaying 150ms closes the *previous* instance
    // after the next mount has opened its own socket.
    return () => {
      const closeAfter = () => {
        if (wsInstance.readyState !== WebSocket.CLOSED && wsInstance.readyState !== WebSocket.CLOSING) {
          console.log("[CALL] Cleanup: closing WebSocket (delayed)");
          wsInstance.close();
        }
        if (wsRef.current === wsInstance) {
          wsRef.current = null;
        }
        setSocketReady(false);
      };
      setTimeout(closeAfter, 150);
    };
    // Single WebSocket per booking
  }, [bookingId]);

  const ensurePeerConnection = async () => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(
            JSON.stringify({
              type: "ice-candidate",
              candidate: event.candidate,
              sender: role,
            })
          );
        } catch (err) {
          console.error("Error sending ICE candidate", err);
        }
      }
    };

    pc.ontrack = (event) => {
      console.log("📹 Received remote stream");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        setStatus(`Connection ${pc.iceConnectionState}`);
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const sendOffer = async () => {
    if (!pcRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("Cannot send offer - not ready");
      return;
    }

    try {
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      const msg = { type: "offer", sdp: offer, sender: role };
      wsRef.current.send(JSON.stringify(msg));
      console.log("[CALL] Sent offer, readyState:", wsRef.current.readyState);
    } catch (err) {
      console.error("Error sending offer", err);
      setStatus(`Error: ${err.message}`);
    }
  };

  const startCall = useCallback(async () => {
    if (!bookingId) {
      alert("Missing booking id");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Camera/mic not supported in this browser");
      return;
    }

    if (!socketReady || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setStatus("Connecting... Please wait.");
      return;
    }

    try {
      setStatus("Requesting camera/microphone...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = await ensurePeerConnection();
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Only caller creates and sends offer AFTER call is accepted
      if (isCaller) {
        if (callAccepted) {
          // Call already accepted, send offer immediately
          await sendOffer();
          setCallActive(true);
          setStatus("Calling...");
        } else {
          // Wait for accept_call message
          setStatus("Waiting for call to be accepted...");
        }
      } else {
        // Receiver: wait for offer
        setStatus("Waiting for call...");
      }
    } catch (err) {
      console.error("Failed to start call", err);
      alert("Unable to start video call: " + err.message);
      setStatus("Error starting call");
    }
  }, [bookingId, socketReady, isCaller, callAccepted, role]);


  const handleEndClick = () => {
    endCall(true, true);
  };

  // Auto-start call when socket is ready and user is caller
  useEffect(() => {
    if (socketReady && isCaller && !callActive && !localStreamRef.current) {
      startCall();
    }
  }, [socketReady, isCaller, callActive, startCall]);

  return (
    <div className="video-call-page">
      <div className="video-call-topbar">
        <h2>Booking #{bookingId}</h2>
        <span className="video-call-status">{status}</span>
      </div>

      {/* Remote video – full screen */}
      <div className="video-call-remote-wrap">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="video-remote"
        />
      </div>

      {/* Local video – PiP */}
      <div className="video-call-local-wrap">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="video-local"
        />
      </div>

      {/* Setup state: show prompt when call not yet active */}
      {!callActive && (
        <div className="video-call-setup">
          <div className="video-call-setup-inner">
            <h3 style={{ margin: 0, fontSize: "1.25rem" }}>
              {!socketReady ? "Connecting…" : isCaller ? "Start video call" : "Answer call"}
            </h3>
            <p>{status}</p>
          </div>
        </div>
      )}

      {/* Bottom control bar – WhatsApp/Google style */}
      <div className="video-call-controls-bar">
        {!callActive && (
          <button
            type="button"
            className="video-call-btn video-call-btn-answer"
            onClick={startCall}
            disabled={!socketReady || callActive}
            title={!socketReady ? "Waiting for connection…" : isCaller ? "Start Call" : "Answer Call"}
          >
            {!socketReady ? "🔄" : "📞"}
          </button>
        )}
        <button
          type="button"
          className="video-call-btn video-call-btn-end"
          onClick={handleEndClick}
          title="End call"
        >
          📵
        </button>
      </div>
    </div>
  );
}

export default VideoCall;
