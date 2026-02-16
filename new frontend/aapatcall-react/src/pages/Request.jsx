import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/request.css";
import Navbar from "../components/Navbar";
import API from "../api";
import { AuthContext } from "../context/AuthContext";

export default function RequestMechanic() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [problem, setProblem] = useState("Car Not Starting");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [vehicleType, setVehicleType] = useState("4W"); // 2W / 4W / EV

  // ==============================
  // 📍 Detect Location
  // ==============================
  const detectLocation = () => {
    setError("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported in your browser");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setCoords({ latitude, longitude });
        setLocation(`Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`);
        setLoading(false);
      },
      (err) => {
        console.log(err);
        if (err.code === 1) setError("Location permission denied");
        else if (err.code === 2) setError("Location unavailable");
        else setError("Location request timeout");
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Auto-detect location on mount
  useEffect(() => {
    detectLocation();
  }, []);

  // ==============================
  // 🚗 Submit Request (REAL BACKEND)
  // ==============================
  const submitRequest = async () => {
    setError("");

    if (!problem) {
      setError("Please select problem type");
      return;
    }

    if (!coords) {
      setError("Please detect location first");
      return;
    }

    if (!user) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        user_id: user.id,
        latitude: Number(coords.latitude),
        longitude: Number(coords.longitude),
        problem: problem,
        location_text: location,
        vehicle_type: vehicleType,
      };

      console.log("🚀 Sending request:", payload);

      const res = await API.post("request/create/", payload);

      console.log("✅ Request response:", res.data);

      // Store booking ID
      if (res.data.booking_id) {
        localStorage.setItem("activeBooking", res.data.booking_id);
      }

      alert("Request submitted successfully!");
      navigate(`/tracking?booking=${res.data.booking_id}`);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error || "Failed to request mechanic. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* NAVBAR */}
      <Navbar />

      {/* MAIN */}
      <main className="request-page">
        <h1>Request a Mechanic</h1>
        <p className="subtitle">
          Tell us your problem and we'll send help instantly.
        </p>

        <div className="request-card">
          {/* Problem */}
          <label>Problem Type</label>
          <select value={problem} onChange={(e) => setProblem(e.target.value)}>
            <option>Car Not Starting</option>
            <option>Flat Tire</option>
            <option>Battery Issue</option>
            <option>Engine Overheating</option>
            <option>Brake Failure</option>
            <option>Fuel Delivery Needed</option>
          </select>

          {/* Vehicle Type */}
          <label>Vehicle Type</label>
          <select
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
          >
            <option value="2W">2 Wheeler</option>
            <option value="4W">4 Wheeler</option>
            <option value="EV">EV Vehicle</option>
          </select>

          {/* Location */}
          <label>Your Location</label>
          <div className="location-box">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Auto-detect or enter manually"
            />
            <button
              type="button"
              className="detect-btn"
              onClick={detectLocation}
              disabled={loading}
            >
              📍
            </button>
          </div>

          {/* Error Message */}
          {error && <p className="error">{error}</p>}

          {/* CTA */}
          <button
            type="button"
            className="primary-btn"
            onClick={submitRequest}
            disabled={loading}
          >
            {loading ? "Finding Mechanic..." : "Find Nearby Mechanic 🚗"}
          </button>
        </div>
      </main>
    </div>
  );
}
