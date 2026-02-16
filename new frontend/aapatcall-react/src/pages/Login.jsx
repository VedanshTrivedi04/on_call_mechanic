import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import bg from "../assets/images/login-bg.jpeg";
import API from "../api";
import { AuthContext } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function Login() {
  const [step, setStep] = useState("role");
  const [selectedRole, setSelectedRole] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const selectRole = (role) => {
    setSelectedRole(role);
    setStep("phone");
  };

  const sendOTP = async () => {
    if (!email) {
      alert("Please enter Email");
      return;
    }

    try {
      setLoading(true);
      await API.post("auth/send-otp/", {
        email: email,
        phone: "",
      });
      alert("OTP sent successfully!");
      setStep("otp");
    } catch (error) {
      alert(error.response?.data?.error || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      alert("Please enter 6-digit OTP");
      return;
    }

    try {
      setLoading(true);
      const res = await API.post("auth/verify-otp/", {
        email: email,
        otp: otp,
      });

      login({
        id: res.data.user_id,
        email: res.data.email,
        role: res.data.role,
      });

      alert(`Login successful as ${selectedRole}`);

      if (selectedRole === "user") {
        navigate("/user");
      } else if (selectedRole === "mechanic") {
        navigate("/mechanic");
      } else {
        navigate("/admin");
      }
    } catch (error) {
      alert(error.response?.data?.error || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const changeNumber = () => {
    setStep("phone");
    setOtp("");
  };

  return (
    <>
      <Navbar />
      <div className="auth-body" style={{ backgroundImage: `url(${bg})` }}>
        <div className="login-wrapper">
          <div className="login-card">
            {/* Logo */}
            <div className="logo-box">📞</div>

            {/* Heading */}
            <h1 className="title">Welcome to आपातCall</h1>
            <p className="subtitle">Sign in to continue</p>

            {/* Role Selection */}
            {step === "role" && (
              <div className="role-select">
                <button
                  className={`role ${selectedRole === "user" ? "active" : ""}`}
                  onClick={() => selectRole("user")}
                >
                  👤 <span>User</span>
                </button>
                <button
                  className={`role ${selectedRole === "mechanic" ? "active" : ""}`}
                  onClick={() => selectRole("mechanic")}
                >
                  🔧 <span>Mechanic</span>
                </button>
                <button
                  className={`role ${selectedRole === "admin" ? "active" : ""}`}
                  onClick={() => selectRole("admin")}
                >
                  🛡 <span>Admin</span>
                </button>
              </div>
            )}

            {/* EMAIL STEP */}
            {step === "phone" && (
              <div id="phoneStep">
                <label className="label">Email Address</label>
                <div className="phone-box">
                  <input
                    id="phone"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button
                  className="otp-btn"
                  onClick={sendOTP}
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send OTP →"}
                </button>
                <p className="change-number" onClick={() => setStep("role")}>
                  ← Change role
                </p>
              </div>
            )}

            {/* OTP STEP */}
            {step === "otp" && (
              <div id="otpStep">
                <p className="otp-info" id="otpInfo">
                  OTP sent to {email}
                </p>
                <label className="label">Enter OTP</label>
                <input
                  id="otp"
                  className="otp-input"
                  placeholder="6-digit OTP"
                  maxLength="6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                />
                <button
                  className="otp-btn"
                  onClick={verifyOTP}
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify & Continue →"}
                </button>
                <p className="change-number" onClick={changeNumber}>
                  Change email
                </p>
              </div>
            )}
          </div>
        </div>
      
      </div>
    </>
  );
}

export default Login;
