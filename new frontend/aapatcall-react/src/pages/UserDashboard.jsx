import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import FeedbackModal from "../components/FeedbackModal";
import "../styles/dashboard.css";
import API from "../api";
import { AuthContext } from "../context/AuthContext";

export default function UserDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [currentBooking, setCurrentBooking] = useState(null);
  const [lastService, setLastService] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackBooking, setFeedbackBooking] = useState(null);

  useEffect(() => {
    // Check for active booking
    const activeBookingId = localStorage.getItem("activeBooking");
    if (activeBookingId) {
      setCurrentBooking({
        id: activeBookingId,
        status: "Active",
      });
    }

    // Check for completed booking that needs feedback
    const completedBookingStr = localStorage.getItem("completedBooking");
    if (completedBookingStr) {
      try {
        const completedBooking = JSON.parse(completedBookingStr);
        const feedbackSubmitted = localStorage.getItem(`feedback_${completedBooking.bookingId}`);
        
        if (!feedbackSubmitted) {
          setFeedbackBooking(completedBooking);
          setShowFeedback(true);
        }
        
        // Clean up after showing feedback
        localStorage.removeItem("completedBooking");
      } catch (err) {
        console.error("Error parsing completed booking:", err);
        localStorage.removeItem("completedBooking");
      }
    }

    // TODO: Fetch last service from backend
    // API.get(`/user/last-booking/`).then(res => setLastService(res.data))
  }, []);

  const requestMechanic = () => {
    navigate("/request");
  };

  const openAssistant = () => {
    navigate("/assistant");
  };

  const viewHistory = () => {
    navigate("/user/history");
  };

  const viewTracking = () => {
    const bookingId = localStorage.getItem("activeBooking");
    if (bookingId) {
      navigate(`/tracking?booking=${bookingId}`);
    } else {
      alert("No active booking");
    }
  };

  return (
    <>
      <Navbar />

      {showFeedback && feedbackBooking && (
        <FeedbackModal
          visible={showFeedback}
          bookingId={feedbackBooking.bookingId}
          mechanicId={feedbackBooking.mechanicId || null}
          onClose={() => {
            setShowFeedback(false);
            setFeedbackBooking(null);
          }}
        />
      )}

      <main className="dashboard">
        {/* Welcome */}
        <section className="welcome">
          <h1>Welcome Back 👋</h1>
          <p>Your roadside assistance is just one click away.</p>
        </section>

        {/* Booking Status */}
        <section className="cards">
          {/* Current Booking */}
          <div className="card highlight">
            <h3>🚧 Current Booking</h3>
            {currentBooking ? (
              <div>
                <p>Booking #{currentBooking.id}</p>
                <p style={{ fontSize: 12, color: "#666" }}>
                  Status: {currentBooking.status}
                </p>
                <button
                  onClick={viewTracking}
                  style={{
                    marginTop: 8,
                    padding: "6px 12px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  View Tracking
                </button>
              </div>
            ) : (
              <p>No active booking</p>
            )}
          </div>

          {/* Last Service / History */}
          <div className="card">
            <h3>🧾 History</h3>
            <p>View all your past bookings and services.</p>
            <button
              type="button"
              onClick={viewHistory}
              style={{
                marginTop: 10,
                padding: "8px 16px",
                background: "#0f172a",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              View History
            </button>
          </div>
        </section>

        {/* CTA */}
        <div className="cta-box">
          <button className="primary-btn" onClick={requestMechanic}>
            Request a Mechanic 🚗
          </button>
          <button
            type="button"
            className="primary-btn assistant-btn"
            onClick={openAssistant}
          >
            Help with Assistant 🛠️
          </button>
        </div>
      </main>
    </>
  );
}
