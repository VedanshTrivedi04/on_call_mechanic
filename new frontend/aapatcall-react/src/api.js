import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";
const API = axios.create({
  baseURL: `${API_BASE}/api/`,
});

/** WebSocket base URL (same host as API for video call & tracking). */
export const WS_BASE = API_BASE.replace(/^http/, "ws");

export default API;
