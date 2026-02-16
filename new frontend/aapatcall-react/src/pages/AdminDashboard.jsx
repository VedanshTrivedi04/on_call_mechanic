// src/pages/AdminDashboard.jsx
import "../styles/style.css";
import "../styles/dashboard.css";

export default function AdminDashboard() {
  return (
    <>
      {/* NAVBAR */}
      <header className="navbar">
        <h2>Admin Panel</h2>
      </header>

      {/* DASHBOARD CARDS */}
      <section className="section grid">

        <div className="card">
          <h3>Total Users</h3>
          <p>1,204</p>
        </div>

        <div className="card">
          <h3>Total Mechanics</h3>
          <p>86</p>
        </div>

        <div className="card">
          <h3>Total Bookings</h3>
          <p>3,452</p>
        </div>

        <div className="card">
          <h3>Revenue</h3>
          <p>₹2.4L</p>
        </div>

      </section>
    </>
  );
}
