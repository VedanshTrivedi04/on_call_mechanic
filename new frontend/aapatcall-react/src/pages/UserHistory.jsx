import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../api";
import { AuthContext } from "../context/AuthContext";
import "../styles/dashboard.css";
import "../styles/history.css";

export default function UserHistory() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      navigate("/login");
      return;
    }
    API.get(`user/bookings/?user_id=${user.id}`)
      .then((res) => setBookings(res.data.bookings || []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [user?.id, navigate]);

  const formatMoney = (n) => {
    if (n == null) return "—";
    return "₹" + Number(n).toLocaleString("en-IN");
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <Navbar />
      <main className="dashboard history-page">
        <section className="welcome">
          <h1>Booking History 📋</h1>
          <p>All your past and current service requests.</p>
        </section>

        {loading ? (
          <p className="history-loading">Loading...</p>
        ) : bookings.length === 0 ? (
          <div className="card">
            <p className="history-empty">No bookings yet. Request a mechanic when you need help!</p>
            <button
              type="button"
              className="primary-btn"
              style={{ marginTop: 16 }}
              onClick={() => navigate("/request")}
            >
              Request a Mechanic
            </button>
          </div>
        ) : (
          <ul className="history-list">
            {bookings.map((b) => (
              <li key={b.id} className="history-card card">
                <div className="history-row">
                  <strong>Booking #{b.id}</strong>
                  <span className={`history-status status-${b.status?.toLowerCase()}`}>
                    {b.status}
                  </span>
                </div>
                <div className="history-detail">{b.problem}</div>
                <div className="history-detail history-muted">{b.location_text}</div>
                <div className="history-row history-meta">
                  <span>{formatDate(b.completed_at || b.requested_at)}</span>
                  {b.fare != null && <span className="history-fare">{formatMoney(b.fare)}</span>}
                </div>
                {["PENDING", "ACCEPTED", "EN_ROUTE", "ON_SITE"].includes(b.status) && (
                  <button
                    type="button"
                    className="history-track-btn"
                    onClick={() => navigate(`/tracking?booking=${b.id}`)}
                  >
                    View Tracking
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
