# System testing checklist

Use this to verify the on-call mechanic system, especially **video call** and **Google Map / location** features.

## Prerequisites

1. **Backend (Django + Channels)**  
   From project root:
   ```bash
   cd mechanic_ai
   python manage.py runserver
   ```
   Ensure Daphne/ASGI is used for WebSockets (e.g. `daphne mechanic_ai.asgi:application` or runserver with Channels).

2. **Frontend**  
   ```bash
   cd "new frontend/aapatcall-react"
   npm install
   npm run dev
   ```

3. **API base URL**  
   Edit `src/api.js`: `API_BASE` should point to your backend (default `http://127.0.0.1:8000`). WebSocket URL is derived from it (`ws://127.0.0.1:8000`).

4. **Google Maps**  
   Tracking pages use a Maps API key in the script URL. If the map does not load:
   - Create a key at [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → enable **Maps JavaScript API**.
   - Replace the key in:
     - `src/pages/MechanicTracking.jsx`
     - `src/pages/LiveTracking.jsx`

---

## 1. Location & maps

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Login as **user** → Request a mechanic (allow location when prompted). | Location is detected; request is sent. |
| 1.2 | On **Live Tracking** page, allow location if asked. | Map loads; your position and (after mechanic accepts) mechanic’s position appear. |
| 1.3 | Login as **mechanic** → go online → accept the same booking → open **Mechanic Tracking**. | Map loads; customer marker appears when user location is sent; “Open in Google Maps” works when customer location is available. |
| 1.4 | As mechanic, click **“Open in Google Maps”**. | Google Maps opens (browser or app) with directions to the customer. |

---

## 2. Video call

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | User: from **Live Tracking**, click **“Start video call”**. | Call WebSocket connects; other party can get “incoming call” (if both are on tracking). |
| 2.2 | Mechanic: accept from **Mechanic Tracking** (incoming call modal or “Start video call” then user accepts). | Both are redirected to `/call?booking=...&role=...&caller=...`. |
| 2.3 | On **Video Call** page: allow camera/mic when prompted. | Local video (PiP) and remote video appear; WebRTC connects (status “Call connected”). |
| 2.4 | Click **End call** (📵). | Call ends; both return to their tracking page. |
| 2.5 | As **receiver**, click **Reject** on incoming call. | Call is rejected; caller sees “Call rejected”. |

**Notes**

- Video call uses **WebSocket** at `ws://<API_HOST>/ws/call/<booking_id>/` and **WebRTC** (STUN: `stun.l.google.com:19302`). No TURN is configured; same network usually works.
- If “Connecting…” never becomes “Call connected”, check browser console and backend logs for WebSocket and WebRTC errors.

---

## 3. Quick smoke tests

- **User flow:** Login (user) → Request mechanic → Live Tracking → (optional) Start video call → End call.
- **Mechanic flow:** Login (mechanic) → Go online → Accept request → Mechanic Tracking → (optional) Start/Answer video call → Open in Google Maps → Update status → Complete job.
- **Voice assistant:** User → Help with Assistant → allow mic & location → say “battery dead” → say “yes” to book → confirm redirect to tracking.

---

## 4. Build check

```bash
cd "new frontend/aapatcall-react"
npm run build
```

Build should finish without errors. If it fails, fix reported issues before relying on production build.
