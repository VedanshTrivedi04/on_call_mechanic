import axios from "axios";

const API_BASE = "https://on-call-mechanic-1.onrender.com";
const API = axios.create({
  baseURL: `${API_BASE}/api/`,
   withCredentials: true,
});

/** WebSocket base URL (same host as API for video call & tracking). */
export const WS_BASE = API_BASE.replace(/^http/, "ws");

export default API;
