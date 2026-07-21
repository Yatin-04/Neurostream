// ────────────────────────────────────────────────────────────────
// NeuroStream — Cognition-Aware WebRTC Signaling Server
//
// This server is ONLY responsible for signaling:
//   • Relay SDP offers / answers between peers
//   • Relay ICE candidates between peers
//   • Manage room membership (full-mesh, max 4 per room)
//
// It NEVER touches media bytes.
// ────────────────────────────────────────────────────────────────

import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './src/routes/auth.js';

// ── Configuration ───────────────────────────────────────────────

const PORT = parseInt(process.env.PORT, 10) || 3001;
const MAX_PEERS_PER_ROOM = 4;

// Parse comma-separated origins, trim whitespace
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

// ── Express App ─────────────────────────────────────────────────

const app = express();

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

// ── Auth Routes ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

import telemetryRoutes from './src/routes/telemetry.js';
app.use('/api/telemetry', telemetryRoutes);

// ── State ───────────────────────────────────────────────────────
// rooms:       roomId → Set<socketId>   — who is in each room
// socketRooms: socketId → roomId        — reverse lookup for cleanup
// socketNames: socketId → username      — display names for peers

/** @type {Map<string, Set<string>>} */
const rooms = new Map();

/** @type {Map<string, string>} */
const socketRooms = new Map();

/** @type {Map<string, string>} */
const socketNames = new Map();

// ── Helper: Aggregate Peer Count ────────────────────────────────

function totalPeerCount() {
  let count = 0;
  for (const members of rooms.values()) {
    count += members.size;
  }
  return count;
}

// ── REST Endpoints ──────────────────────────────────────────────

/**
 * Health check — useful for load balancers & monitoring.
 * Returns current room and peer counts.
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    rooms: rooms.size,
    peers: totalPeerCount(),
  });
});

/**
 * TURN credentials endpoint.
 * Returns an ICE server configuration array containing:
 *   1. Google public STUN server (always available)
 *   2. Metered.ca TURN servers (when env vars are set)
 */
app.get('/api/turn-credentials', (_req, res) => {
  const iceServers = [
    // Free public STUN — always included
    { urls: 'stun:stun.l.google.com:19302' },
  ];

  const turnUrl = process.env.METERED_TURN_URL;
  const turnUsername = process.env.METERED_TURN_USERNAME;
  const turnCredential = process.env.METERED_TURN_CREDENTIAL;

  // Append TURN servers only when credentials are configured
  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push(
      {
        urls: `turn:${turnUrl}:80?transport=udp`,
        username: turnUsername,
        credential: turnCredential,
      },
      {
        urls: `turn:${turnUrl}:80?transport=tcp`,
        username: turnUsername,
        credential: turnCredential,
      },
      {
        urls: `turn:${turnUrl}:443?transport=tcp`,
        username: turnUsername,
        credential: turnCredential,
      },
      {
        urls: `turns:${turnUrl}:443?transport=tcp`,
        username: turnUsername,
        credential: turnCredential,
      },
    );
  }

  res.json({ iceServers });
});

// ── HTTP Server + Socket.io ─────────────────────────────────────

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
  },
});

// ── Socket.io Signaling Logic ───────────────────────────────────

io.on('connection', (socket) => {
  console.log(`⚡ Connected: ${socket.id}`);

  // ── Join Room ───────────────────────────────────────────────
  socket.on('join-room', (data) => {
    // Accept both old format (string) and new format ({ roomId, username })
    const roomId = typeof data === 'string' ? data : data?.roomId;
    const username = typeof data === 'string' ? 'Anonymous' : (data?.username || 'Anonymous');

    // Ensure roomId is a non-empty string
    if (!roomId || typeof roomId !== 'string') {
      console.warn(`⚠  Invalid roomId from ${socket.id}`);
      return;
    }

    // Initialise room set if first peer
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }

    const members = rooms.get(roomId);

    // Enforce full-mesh cap
    if (members.size >= MAX_PEERS_PER_ROOM) {
      socket.emit('room-full');
      console.log(`🚫 [Room ${roomId}] ${socket.id} rejected — room full (${members.size}/${MAX_PEERS_PER_ROOM})`);
      return;
    }

    // Store username
    socketNames.set(socket.id, username);

    // Send the newcomer the list of existing peers WITH usernames
    const existingPeers = [...members].map((id) => ({
      id,
      username: socketNames.get(id) || 'Anonymous',
    }));
    socket.emit('room-peers', existingPeers);

    // Register membership
    members.add(socket.id);
    socketRooms.set(socket.id, roomId);
    socket.join(roomId);

    // Notify existing peers about the newcomer WITH username
    socket.to(roomId).emit('user-joined', { peerId: socket.id, username });

    console.log(`✅ [Room ${roomId}] ${socket.id} (${username}) joined (${members.size} peer${members.size > 1 ? 's' : ''})`);
  });

  // ── Relay SDP Offer ─────────────────────────────────────────
  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', { from: socket.id, offer });
  });

  // ── Relay SDP Answer ────────────────────────────────────────
  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  // ── Relay ICE Candidate ─────────────────────────────────────
  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  // ── Disconnect Cleanup ──────────────────────────────────────
  socket.on('disconnect', () => {
    const roomId = socketRooms.get(socket.id);

    if (roomId) {
      const members = rooms.get(roomId);

      if (members) {
        members.delete(socket.id);

        // Notify remaining peers
        socket.to(roomId).emit('user-left', socket.id);

        // Garbage-collect empty rooms
        if (members.size === 0) {
          rooms.delete(roomId);
          console.log(`🗑  [Room ${roomId}] Empty — removed`);
        } else {
          console.log(`👋 [Room ${roomId}] ${socket.id} left (${members.size} peer${members.size > 1 ? 's' : ''} remaining)`);
        }
      }

      socketRooms.delete(socket.id);
    }

    socketNames.delete(socket.id);
    console.log(`🔌 Disconnected: ${socket.id}`);
  });
});

// ── Start Server ────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║        🧠  NeuroStream Signaling Server         ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Port:    ${String(PORT).padEnd(38)}║`);
  console.log(`║  Origins: ${ALLOWED_ORIGINS.join(', ').padEnd(38)}║`);
  console.log(`║  TURN:    ${process.env.METERED_TURN_URL ? 'configured ✓' : 'not configured (STUN only)'}`.padEnd(51) + '║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
});
