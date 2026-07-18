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
