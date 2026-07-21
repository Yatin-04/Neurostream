# NeuroStream

**WebRTC video calls that know when you're paying attention.**

NeuroStream runs two ML models directly in your browser — a head-pose estimator (MediaPipe FaceLandmarker) and a voice activity detector (Silero VAD) — to figure out if you're actually engaged in the call. When you look away and stop talking, it quietly drops your outgoing video to 50 kbps. The moment you glance back or start speaking, full quality snaps back in under 500ms.

No server-side SFU. No cloud inference. Everything runs on-device in WASM/ONNX, P2P mesh, up to 4 people.

<!-- screenshot: landing page / lobby -->

---

## Why does this exist?

Video calls waste a ton of bandwidth on people who aren't even looking at the screen. Think about it — in a 4-person call, at any given moment, probably only 1-2 people are actively engaged. The rest are checking their phone, looking at notes, or just passively listening.

NeuroStream treats the webcam feed as a **control signal**, not just a media source. If you're not engaged, your upstream doesn't need to be pumping 2.5 Mbps of high-res video. Drop it to near-zero, and nobody notices because they're not looking at you either.

The tricky part is getting this right without being annoying — you can't flicker between throttled and full quality every time someone blinks or scratches their nose. That's where the hysteresis controller comes in.

---

## How it works

```
┌──────────────┐    ┌──────────────┐
│  MediaPipe   │    │  Silero VAD  │
│  FaceMesh    │    │  (ONNX/WASM) │
│  (WASM/GPU)  │    │              │
└──────┬───────┘    └──────┬───────┘
       │ isAttentive       │ isSpeaking
       └───────┬───────────┘
               ▼
    ┌─────────────────────┐
    │  Cognitive Loop      │
    │  (Hysteresis FSM)    │
    │                      │
    │  Throttle: 5s delay  │
    │  Restore:  instant   │
    └──────────┬──────────┘
               ▼
    ┌─────────────────────┐
    │  RTCRtpSender       │
    │  .setParameters()    │
    │                      │
    │  maxBitrate: 50kbps  │
    │  maxFramerate: 5fps  │
    │  scaleDown: 4x       │
    └─────────────────────┘
```

**The rules are simple:**
- Not looking at screen AND not talking → throttle kicks in after 5 seconds
- Looking at screen OR talking → instant restore, no delay
- Screen share tracks are immune — never throttled
- If your device can't handle the ML models (<24 fps), the AI engine disables itself automatically

The 5-second delay before throttling and the instant restore is the "asymmetric hysteresis" — it prevents the annoying flickering you'd get with a naive threshold. You need to be genuinely disengaged for it to kick in, but the moment you re-engage, it's back at full quality before you even notice.

<!-- screenshot: telemetry hud showing throttle/restore cycle -->

---

## Features

### Video Calling
- P2P mesh topology using `RTCPeerConnection` (full-mesh, max 4 peers)
- WebRTC Perfect Negotiation pattern with polite/impolite peer roles
- STUN (Google) + TURN (Metered.ca) for NAT traversal
- Screen sharing with track management and auto-cleanup
- Tile pinning layout (click to focus on a speaker)

### ML Pipeline (runs entirely in-browser)
- **Head Pose Estimation**: MediaPipe FaceLandmarker extracts a 4×4 transformation matrix per frame, from which yaw and pitch are derived. Thresholds: yaw > 25°, pitch > 20° → looking away
- **Voice Activity Detection**: Silero VAD via ONNX Runtime Web, attached directly to the local MediaStream audio track. Tuned with a 60-frame redemption window (~1.8s) so natural pauses while speaking don't trigger a false "stopped talking"
- **Device Benchmark**: 5-second rAF loop at startup. If measured FPS < 24 under load, AI engine auto-disables. No point running inference on hardware that can't handle it

### Telemetry
- Live HUD panel with outbound/inbound bitrate, jitter, RTT, and packet loss
- 60-second rolling time-series chart (Recharts)
- Bandwidth savings counter in the call footer
- Session summary modal on disconnect with total savings and throttle stats

### Scripted Benchmark Mode
Append `?benchmark=true` to any room URL to run a 60-second automated test:
```
 0s  → Baseline (attentive, silent)
10s  → Inattentive trigger
20s  → Restore
30s  → VAD override test (inattentive but speaking)
40s  → Re-throttle
50s  → Full restore
60s  → Export JSON results
```
Useful for reproducible performance testing. The exported JSON captures telemetry snapshots every 500ms with all sensor states.

### Auth System
- Email/password registration with OTP email verification
- Login with JWT (stored in localStorage + HTTP-only cookie)
- Password reset flow via email OTP
- Username availability checker

### Dashboard
- Room history with quick-rejoin
- Recent peers list
- Lifetime bandwidth savings counter

<!-- screenshot: room page with active call -->

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS |
| ML / Vision | MediaPipe Tasks-Vision (WASM, GPU delegate) |
| ML / Audio | Silero VAD via `@ricky0123/vad-web`, ONNX Runtime Web |
| Signaling | Socket.io (client + server) |
| Backend | Node.js, Express |
| Database | PostgreSQL (Neon) |
| Auth | bcryptjs, JWT, Gmail SMTP for OTP |
| Charts | Recharts |
| TURN | Metered.ca REST API |
| Deploy | Vercel (client), Render/Railway (server) |

---

## Project Structure

```
neurostream/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VideoTile.jsx          # Individual video tile with pin/flip controls
│   │   │   ├── VideoGrid.jsx          # Dynamic grid layout (1-4 peers, pin support)
│   │   │   ├── TelemetryHUD.jsx       # Live stats panel with charts
│   │   │   ├── BandwidthSaved.jsx     # Savings counter + session summary modal
│   │   │   ├── BenchmarkHUD.jsx       # Scripted benchmark progress overlay
│   │   │   ├── AuthShell.jsx          # Shared auth page layout
│   │   │   ├── AuthField.jsx          # Form input component
│   │   │   ├── ProtectedRoute.jsx     # Auth route guard
│   │   │   └── ResonanceField.jsx     # Animated canvas background
│   │   ├── hooks/
│   │   │   ├── useAttention.js        # MediaPipe head pose → isAttentive
│   │   │   ├── useVAD.js              # Silero VAD → isSpeaking
│   │   │   ├── useCognitiveLoop.js    # Hysteresis FSM → throttle/restore
│   │   │   ├── useWebRTCStats.js      # getStats() polling → telemetry
│   │   │   ├── useDeviceBenchmark.js  # Startup perf test → isLowEnd
│   │   │   ├── useBenchmarkMode.js    # Scripted 60s test harness
│   │   │   ├── useSignaling.js        # Socket.io room/peer management
│   │   │   └── useMediaStream.js      # getUserMedia with fallback chain
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx        # Lobby, room creation, dashboard
│   │   │   ├── RoomPage.jsx           # Main call view (WebRTC orchestration)
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── VerifyEmailPage.jsx
│   │   │   └── ForgotPasswordPage.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx        # JWT auth state provider
│   │   └── utils/
│   │       └── api.js                 # Axios instance with auth interceptor
│   ├── vite.config.js                 # Dev server + COOP/COEP headers for SharedArrayBuffer
│   ├── tailwind.config.js             # Custom neuro-* color palette
│   └── vercel.json                    # SPA routing for Vercel
│
├── server/
│   ├── index.js                       # Express + Socket.io entry point
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                  # PostgreSQL pool (Neon)
│   │   │   └── mailer.js             # Gmail API / SMTP email sender
│   │   ├── controller/
│   │   │   └── auth.js               # Register, login, OTP, password reset
│   │   ├── middleware/
│   │   │   └── auth.js               # JWT verification middleware
│   │   └── routes/
│   │       ├── auth.js               # Auth endpoints
│   │       └── telemetry.js          # Bandwidth stats + dashboard data
│   ├── db/
│   │   └── migrate.js                # Schema migration script
│   ├── .env.example
│   └── package.json
│
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A PostgreSQL database (Neon free tier works fine)
- Gmail account for SMTP (or swap in Mailtrap/Resend)

### 1. Clone and setup

```bash
git clone https://github.com/Yatin-04/Neurostream.git
cd Neurostream
```

### 2. Server

```bash
cd server
cp .env.example .env
# Fill in your DATABASE_URL, JWT_SECRET, SMTP creds
npm install
npm run migrate   # creates users, user_stats, recent_rooms, recent_peers tables
npm run dev       # starts on :3001
```

### 3. Client

```bash
cd client
npm install
npm run dev       # starts on :5173
```

Open [http://localhost:5173](http://localhost:5173), register an account, create a room, and open the same room link in a second browser tab (or incognito) to test with 2 peers.

### Environment Variables

```env
# server/.env
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173
NODE_ENV=development

DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
JWT_SECRET=your-secret-here

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="NeuroStream" <noreply@neurostream.dev>

# Optional — TURN relay credentials from metered.ca
METERED_API_KEY=your-metered-api-key
```

> **Note on TURN:** The app works fine with STUN-only for local network testing. TURN is only needed when peers are behind symmetric NATs (common on mobile networks). Sign up at [metered.ca](https://www.metered.ca/) for free TURN credentials.

---

## Important: Cross-Origin Isolation

The Vite dev server injects these headers automatically:

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

These are required for `SharedArrayBuffer`, which ONNX Runtime's WASM backend needs for multi-threaded inference. If you're deploying behind a reverse proxy, make sure these headers are set, or the VAD model will fail to initialize.

---

## Numbers

From internal testing (2 peers, Chrome 126, simulated 10% packet loss):

| Metric | Value |
|--------|-------|
| Bandwidth savings during inattentive periods | ~30-45% of total egress |
| FaceLandmarker inference latency (P95) | <15ms (GPU delegate) |
| Silero VAD onset latency | <300ms |
| Throttle → Restore transition | <500ms |
| Hysteresis thrash rate | ≤2 events/minute under borderline flicker |
| Throttled bitrate | 50 kbps (down from ~2.5 Mbps) |
| Throttled framerate | 5 fps (down from 30 fps) |
| Resolution downscale during throttle | 4× |

---

## Deployment

**Client** — deploy `client/` to Vercel. The `vercel.json` handles SPA routing. Set `VITE_SIGNALING_URL` in Vercel env vars to your server URL.

**Server** — deploy `server/` to Render, Railway, or any Node.js host. Set all env vars from `.env.example`. Make sure `ALLOWED_ORIGINS` includes your Vercel domain.

---

## License

MIT

---

*Built by [Yatin Singh](https://github.com/Yatin-04)*
