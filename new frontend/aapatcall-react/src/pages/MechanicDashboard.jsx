import { useEffect, useRef, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/style.css";
import "../styles/mechanic.css";
import API from "../api";
import { AuthContext } from "../context/AuthContext";
import logo from "../assets/images/primary logo.png";

export default function MechanicDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [online, setOnline] = useState(false);
  const [request, setRequest] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const [toast, setToast] = useState(false);
  const [mechanicId, setMechanicId] = useState(null);
  const [socketInstance, setSocketInstance] = useState(null);
  const [stats, setStats] = useState({ today_earnings: 0, week_earnings: 0, total_jobs: 0 });
  const [jobsHistoryOpen, setJobsHistoryOpen] = useState(false);
  const [jobsList, setJobsList] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [requestCountdown, setRequestCountdown] = useState(null); // 5, 4, 3, 2, 1 then auto-decline

  const audioRef = useRef(null);
  const requestTimerRef = useRef(null); // interval for countdown + auto-decline

  // Restore online state
  useEffect(() => {
    const saved = localStorage.getItem("mechanicOnline");
    if (saved === "true") {
      setOnline(true);
    }
    const runningBooking = localStorage.getItem("runningBooking");
    if (runningBooking) {
      setActiveJob({ bookingId: runningBooking });
    }
  }, []);

  // Fetch mechanic stats (dynamic)
  useEffect(() => {
    if (!user?.id) return;
    API.get(`mechanic/stats/?user_id=${user.id}`)
      .then((res) => setStats(res.data))
      .catch(() => setStats({ today_earnings: 0, week_earnings: 0, total_jobs: 0 }));
  }, [user?.id]);

  // Fetch job history when modal opens
  useEffect(() => {
    if (!jobsHistoryOpen || !user?.id) return;
    setJobsLoading(true);
    API.get(`mechanic/jobs/?user_id=${user.id}`)
      .then((res) => setJobsList(res.data.jobs || []))
      .catch(() => setJobsList([]))
      .finally(() => setJobsLoading(false));
  }, [jobsHistoryOpen, user?.id]);

  // Get mechanic ID when going online
  useEffect(() => {
    if (!online || !user) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await API.post("mechanic/status/", {
            mechanic_id: user.id,
            is_available: true,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setMechanicId(res.data.mechanic_id);
        } catch (err) {
          console.error(err);
        }
      },
      (err) => console.log("GPS error", err)
    );
  }, [online, user]);

  // ================= TOGGLE STATUS =================
  const toggleStatus = async () => {
    const newStatus = !online;

    if (!user) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await API.post("mechanic/status/", {
            mechanic_id: user.id,
            is_available: newStatus,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });

          setOnline(newStatus);
          setMechanicId(res.data.mechanic_id);
          localStorage.setItem("mechanicOnline", newStatus);

          if (!newStatus) {
            // Going offline - close socket
            if (socketInstance) {
              socketInstance.close();
              setSocketInstance(null);
            }
          }
        } catch (err) {
          console.error(err.response?.data || err.message);
          alert("Failed to update status");
        }
      },
      (err) => {
        alert("Location permission required");
      }
    );
  };

  // Clear request countdown timer
  const clearRequestTimer = () => {
    if (requestTimerRef.current) {
      clearInterval(requestTimerRef.current);
      requestTimerRef.current = null;
    }
    setRequestCountdown(null);
  };

  // ================= WEBSOCKET FOR REQUESTS =================
  useEffect(() => {
    if (!mechanicId || !online) return;

    const socket = new WebSocket(
      `ws://127.0.0.1:8000/ws/mechanic/${mechanicId}/`
    );

    socket.onopen = () => console.log("🔥 WS Connected");

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("NEW REQUEST:", data);

      if (data.type === "NEW_REQUEST") {
        clearRequestTimer();
        setRequest({
          problem: data.problem,
          location: data.latitude + ", " + data.longitude,
          price: "₹400 – ₹600",
          eta: "8 mins",
          request_id: data.request_id,
          booking_id: data.booking_id,
          latitude: data.latitude,
          longitude: data.longitude,
        });
        setRequestCountdown(5);
        setToast(true);
        audioRef.current?.play();
        setTimeout(() => setToast(false), 3000);

        // 5 sec countdown: every 1 sec decrement; at 0 call decline and transfer to next mechanic
        let sec = 5;
        requestTimerRef.current = setInterval(() => {
          sec -= 1;
          setRequestCountdown(sec);
          if (sec <= 0) {
            clearRequestTimer();
            API.post("mechanic/decline/", {
              request_id: data.request_id,
              mechanic_id: mechanicId,
            }).catch(() => {});
            setRequest(null);
          }
        }, 1000);
      }
    };

    socket.onerror = () => console.log("WS Error");
    socket.onclose = () => console.log("WS Closed");

    setSocketInstance(socket);
    return () => {
      socket.close();
      clearRequestTimer();
    };
  }, [mechanicId, online]);

  // ================= ACCEPT =================
  const acceptRequest = async () => {
    if (!request || !mechanicId) return;
    clearRequestTimer();

    try {
      const res = await API.post("mechanic/accept/", {
        mechanic_id: mechanicId,
        request_id: request.request_id,
      });

      const bookingId = res.data.booking_id;
      localStorage.setItem("runningBooking", bookingId);
      setActiveJob({
        problem: request.problem,
        location: request.location,
        bookingId: bookingId,
      });

      if (socketInstance) socketInstance.close();
      setRequest(null);
      setRequestCountdown(null);

      navigate(`/mechanic/tracking?booking=${bookingId}`);
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert("Request already taken");
      setRequest(null);
      setRequestCountdown(null);
    }
  };

  // ================= DECLINE (transfer to next mechanic) =================
  const declineRequest = () => {
    if (request && mechanicId) {
      API.post("mechanic/decline/", {
        request_id: request.request_id,
        mechanic_id: mechanicId,
      }).catch(() => {});
    }
    clearRequestTimer();
    setRequest(null);
    setRequestCountdown(null);
  };

  // ================= VIEW LOCATION =================
  const viewLocation = () => {
    if (!activeJob) return;
    navigate(`/mechanic/tracking?booking=${activeJob.bookingId}`);
  };

  const navigateToUser = () => {
    if (!activeJob) return;
    navigate(`/mechanic/tracking?booking=${activeJob.bookingId}`);
  };

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
    <div>
      {/* NAVBAR */}
      <header className="navbar">
        <div className="nav-left">
          <span className="logo"><img src={logo} alt="MechOnCall Logo" /></span>
        </div>

        <nav className="nav-links">
          <span className="user-name">{user?.email || "Mechanic"}</span>
          <a href="/">Home</a>
          <a href="/login" onClick={() => localStorage.clear()}>
            Logout
          </a>
        </nav>
      </header>

      {/* HEADER */}
      <section className="page-header">
        <h1>Welcome back, {user?.email?.split("@")[0] || "Mechanic"} 👋</h1>
        <p>Manage your availability and accept nearby service requests.</p>
      </section>

      {/* ONLINE STATUS */}
      <section className="online-card">
        <div>
          <h3>{online ? "Online" : "Offline"}</h3>
          <p>
            {online ? "You can receive requests" : "Toggle on to receive requests"}
          </p>
        </div>

        <label className="switch">
          <input type="checkbox" checked={online} onChange={toggleStatus} />
          <span className="slider"></span>
        </label>
      </section>

      {/* STATS - Dynamic */}
      <section className="stats">
        <div className="stat">
          {formatMoney(stats.today_earnings)}
          <span>Today&apos;s Earnings</span>
        </div>

        <div className="stat">
          {formatMoney(stats.week_earnings)}
          <span>This Week</span>
        </div>

        <div
          className="stat stat-clickable"
          onClick={() => setJobsHistoryOpen(true)}
          onKeyDown={(e) => e.key === "Enter" && setJobsHistoryOpen(true)}
          role="button"
          tabIndex={0}
        >
          {stats.total_jobs}
          <span>Total Jobs</span>
          <span className="stat-hint">Click to view history</span>
        </div>
      </section>

      {/* Job History Modal */}
      {jobsHistoryOpen && (
        <div className="modal-overlay" onClick={() => setJobsHistoryOpen(false)}>
          <div className="modal-content jobs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Job History</h3>
              <button type="button" className="modal-close" onClick={() => setJobsHistoryOpen(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {jobsLoading ? (
                <p className="jobs-loading">Loading...</p>
              ) : jobsList.length === 0 ? (
                <p className="jobs-empty">No jobs yet.</p>
              ) : (
                <ul className="jobs-list">
                  {jobsList.map((job) => (
                    <li key={job.id} className="job-item">
                      <div className="job-row">
                        <strong>#{job.id}</strong>
                        <span className={`job-status status-${job.status?.toLowerCase()}`}>{job.status}</span>
                      </div>
                      <div className="job-detail">{job.problem}</div>
                      <div className="job-detail job-muted">{job.location_text}</div>
                      <div className="job-row job-meta">
                        <span>{formatDate(job.completed_at || job.requested_at)}</span>
                        {job.fare != null && <span className="job-fare">{formatMoney(job.fare)}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE JOB */}
      {activeJob && (
        <section className="active-job">
          <h3>✅ Active Job</h3>
          <p>
            {activeJob.problem || "Service"} • {activeJob.location || "Location"}
          </p>

          <div className="job-actions">
            <button onClick={viewLocation}>View Location</button>
            <button className="navigate" onClick={navigateToUser}>
              Navigate to User
            </button>
          </div>
        </section>
      )}

      {/* REQUEST POPUP (Uber/Ola style: 5 sec then transfer to next mechanic) */}
      {request && (
        <>
          <div className="request-card-backdrop" onClick={declineRequest}></div>
          <section className="request-card">
            <div className="request-badge">NEW REQUEST</div>
            <h3>🔔 Nearby Service Request</h3>
            {requestCountdown != null && requestCountdown > 0 && (
              <p className="request-countdown">Accept in {requestCountdown}s (or passes to next mechanic)</p>
            )}

            <div className="request-info">
              <p>
                <strong>Problem:</strong> {request.problem}
              </p>
              <p>
                <strong>Location:</strong> {request.location}
              </p>
              <p className="price">Estimated Fare {request.price}</p>
              <p className="eta">Pickup in ~{request.eta}</p>
            </div>

            <div className="actions">
              <button className="decline" onClick={declineRequest}>
                Decline
              </button>
              <button className="accept" onClick={acceptRequest}>
                Accept Job
              </button>
            </div>
          </section>
        </>
      )}

      {/* TOAST */}
      {toast && (
        <div className="toast">🔔 New service request nearby!</div>
      )}

      {/* SOUND */}
      <audio ref={audioRef} src="/assets/sounds/notify.mp3" preload="auto" />
    </div>
  );
}
