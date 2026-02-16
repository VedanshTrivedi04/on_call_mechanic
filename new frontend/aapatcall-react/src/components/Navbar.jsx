import { Link, useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import "../styles/style.css";
import logo from "../assets/images/primary logo.png";
import { AuthContext } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <header className="navbar">
        <div className="nav-left">
          <Link to="/" className="logo">
            <img src={logo} alt="MechOnCall Logo" />
          </Link>
        </div>

        <div className="nav-search">
          <input type="text" placeholder="Search service..." />
          <button className="search-btn">
            <img src="/assets/icons/search.png" alt="Search" />
          </button>
        </div>

        <nav className="nav-links">
          {user && (
            <span className="user-name">
              {user.email?.split("@")[0] || "User"}
            </span>
          )}

          <Link to="/user">Home</Link>
          <Link to="/services">Services</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>

          {user ? (
            <button onClick={handleLogout} className="auth-link">
              Logout
            </button>
          ) : (
            <Link to="/login" className="auth-link">
              Login
            </Link>
          )}
        </nav>

        {/* Hamburger – visible only on mobile via CSS */}
        <button
          className="hamburger"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="overlay show" onClick={closeSidebar} />
      )}

      {/* Mobile sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "show" : ""}`}>
        <div className="sidebar-header">
          <span className="sidebar-brand">MechOnCall</span>
          <button className="close-btn" onClick={closeSidebar}>✕</button>
        </div>
        <nav className="sidebar-links" onClick={closeSidebar}>
          {user && (
            <span className="sidebar-user">
              {user.email?.split("@")[0] || "User"}
            </span>
          )}
          <Link to="/user">Home</Link>
          <Link to="/services">Services</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          {user ? (
            <button onClick={handleLogout} className="sidebar-logout">
              Logout
            </button>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </nav>
      </aside>
    </>
  );
}
