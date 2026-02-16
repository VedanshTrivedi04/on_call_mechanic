import "../styles/style.css";

/**
 * Incoming call popup (WhatsApp/Uber style).
 * Accept → parent should navigate to /call?booking=<bookingId>&role=...&caller=false
 * Reject → parent sends reject_call and notifies caller
 */
function IncomingCallModal({ visible, from, bookingId, onAccept, onReject }) {
  if (!visible) return null;

  const callerLabel =
    from === "mechanic" ? "Mechanic is calling you" : "User is calling you";

  return (
    <div
      className="incoming-call-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <style>{`
        @keyframes incoming-call-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes incoming-call-ring {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
        .incoming-call-overlay .incoming-call-card {
          animation: incoming-call-pulse 1.5s ease-in-out infinite;
        }
        .incoming-call-overlay .incoming-call-icon {
          animation: incoming-call-ring 0.4s ease-in-out infinite;
        }
      `}</style>
      <div
        className="incoming-call-card"
        style={{
          background: "#fff",
          padding: "28px 24px",
          borderRadius: 16,
          width: "90%",
          maxWidth: 360,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          textAlign: "center",
        }}
      >
        <div
          className="incoming-call-icon"
          style={{ fontSize: 48, marginBottom: 16 }}
        >
          📞
        </div>
        <h3 style={{ marginBottom: 8, fontSize: 20 }}>Incoming Call</h3>
        <p style={{ marginBottom: 4, color: "#333" }}>{callerLabel}</p>
        {bookingId && (
          <p style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>
            Booking #{bookingId}
          </p>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            marginTop: 8,
          }}
        >
          <button
            onClick={onReject}
            style={{
              padding: "12px 24px",
              background: "#dc3545",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Reject
          </button>
          <button
            onClick={onAccept}
            style={{
              padding: "12px 24px",
              background: "#28a745",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

export default IncomingCallModal;
