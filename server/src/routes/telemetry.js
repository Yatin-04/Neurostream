import express from 'express';
import pg from 'pg';
import authenticate from '../middleware/auth.js';

const router = express.Router();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// POST /api/telemetry/report
// Clients send this when leaving a room to report bandwidth saved and peers seen
router.post('/report', authenticate, async (req, res) => {
  const { id: userId } = req.user;
  const { roomSlug, bandwidthSaved, connectedPeers } = req.body;

  try {
    await pool.query('BEGIN');

    // 1. Update user_stats
    if (bandwidthSaved > 0) {
      await pool.query(`
        INSERT INTO user_stats (user_id, total_bandwidth_saved_bytes, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          total_bandwidth_saved_bytes = user_stats.total_bandwidth_saved_bytes + EXCLUDED.total_bandwidth_saved_bytes,
          updated_at = NOW()
      `, [userId, bandwidthSaved]);
    }

    // 2. Update recent_rooms
    if (roomSlug) {
      await pool.query(`
        INSERT INTO recent_rooms (user_id, room_slug, last_visited_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id, room_slug) 
        DO UPDATE SET last_visited_at = NOW()
      `, [userId, roomSlug]);
    }

    // 3. Update recent_peers
    if (connectedPeers && Array.isArray(connectedPeers)) {
      for (const peerUsername of connectedPeers) {
        if (peerUsername) {
          // Look up peer_user_id by username
          const peerRes = await pool.query('SELECT id FROM users WHERE username = $1', [peerUsername]);
          if (peerRes.rows.length > 0) {
            const peerId = peerRes.rows[0].id;
            if (peerId !== userId) {
              await pool.query(`
                INSERT INTO recent_peers (user_id, peer_user_id, peer_username, last_connected_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (user_id, peer_user_id) 
                DO UPDATE SET 
                  last_connected_at = NOW(),
                  peer_username = EXCLUDED.peer_username
              `, [userId, peerId, peerUsername]);
            }
          }
        }
      }
    }

    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Telemetry report error:', err);
    res.status(500).json({ error: 'Failed to process telemetry' });
  }
});

// GET /api/user/dashboard
// Fetch dashboard data for the authenticated user
router.get('/dashboard', authenticate, async (req, res) => {
  const { id: userId } = req.user;

  try {
    // Get stats
    const statsResult = await pool.query(
      'SELECT total_bandwidth_saved_bytes FROM user_stats WHERE user_id = $1',
      [userId]
    );
    const totalBandwidthSaved = statsResult.rows[0]?.total_bandwidth_saved_bytes || 0;

    // Get recent rooms (top 5)
    const roomsResult = await pool.query(
      'SELECT room_slug, last_visited_at FROM recent_rooms WHERE user_id = $1 ORDER BY last_visited_at DESC LIMIT 5',
      [userId]
    );

    // Get recent peers (top 10)
    const peersResult = await pool.query(
      'SELECT peer_user_id as id, peer_username as username, last_connected_at FROM recent_peers WHERE user_id = $1 ORDER BY last_connected_at DESC LIMIT 10',
      [userId]
    );

    res.json({
      totalBandwidthSaved,
      recentRooms: roomsResult.rows,
      recentPeers: peersResult.rows
    });
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
