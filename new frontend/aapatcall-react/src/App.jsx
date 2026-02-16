import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Services from "./pages/Services";
import About from "./pages/About";
import AdminDashboard from "./pages/AdminDashboard";
import MechanicDashboard from "./pages/MechanicDashboard";
import MechanicTracking from "./pages/MechanicTracking";
import UserDashboard from "./pages/UserDashboard";
import Request from "./pages/Request";
import VoiceAssistant from "./pages/VoiceAssistant";
import UserHistory from "./pages/UserHistory";
import LiveTracking from "./pages/LiveTracking";
import VideoCall from "./pages/VideoCall";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/services" element={<Services />} />
          <Route path="/about" element={<About />} />

          {/* USER ROUTES */}
          <Route
            path="/user"
            element={
              <ProtectedRoute allowedRole="user">
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/request"
            element={
              <ProtectedRoute allowedRole="user">
                <Request />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assistant"
            element={
              <ProtectedRoute allowedRole="user">
                <VoiceAssistant />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/history"
            element={
              <ProtectedRoute allowedRole="user">
                <UserHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tracking"
            element={
              <ProtectedRoute allowedRole="user">
                <LiveTracking />
              </ProtectedRoute>
            }
          />

          {/* MECHANIC ROUTES */}
          <Route
            path="/mechanic"
            element={
              <ProtectedRoute allowedRole="mechanic">
                <MechanicDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mechanic/tracking"
            element={
              <ProtectedRoute allowedRole="mechanic">
                <MechanicTracking />
              </ProtectedRoute>
            }
          />

          {/* ADMIN ROUTES */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* SHARED VIDEO CALL */}
          <Route
            path="/call"
            element={
              <ProtectedRoute>
                <VideoCall />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
