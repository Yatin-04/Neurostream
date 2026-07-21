import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const migration = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password      VARCHAR(255) NOT NULL,
  is_verified   BOOLEAN DEFAULT false,
  otp_code      VARCHAR(6),
  otp_expires_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id                     INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_bandwidth_saved_bytes BIGINT DEFAULT 0,
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recent_rooms (
  user_id         INT REFERENCES users(id) ON DELETE CASCADE,
  room_slug       VARCHAR(255) NOT NULL,
  last_visited_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, room_slug)
);

CREATE TABLE IF NOT EXISTS recent_peers (
  user_id           INT REFERENCES users(id) ON DELETE CASCADE,
  peer_user_id      INT REFERENCES users(id) ON DELETE CASCADE,
  peer_username     VARCHAR(50) NOT NULL,
  last_connected_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, peer_user_id)
);
`;

async function run() {
  try {
    await pool.query(migration);
    console.log('✅ Migration complete — users table ready');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
