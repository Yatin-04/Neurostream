import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { sendOtpEmail, sendResetEmail } from '../config/mailer.js';

const JWT_SECRET = process.env.JWT_SECRET || 'neurostream-dev-secret';
const JWT_EXPIRES = '7d';
const OTP_EXPIRY_MIN = 10;

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
}

// ── Register ─────────────────────────────────────────────────────────

export async function register(req, res) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username],
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Email or username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);

    await pool.query(
      `INSERT INTO users (username, email, password, otp_code, otp_expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [username, email, hashedPassword, otp, otpExpires],
    );

    try {
      await sendOtpEmail(email, otp);
    } catch (err) {
      console.warn('[Auth] Email send failed:', err.message);
    }

    const response = { message: 'Registration successful. Check your email for the verification code.', email };
    if (process.env.NODE_ENV !== 'production') response.dev_otp = otp;

    res.status(201).json(response);
  } catch (err) {
    console.error('[Auth] Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
}

// ── Verify Email ─────────────────────────────────────────────────────

export async function verifyEmail(req, res) {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email],
  );
  const user = result.rows[0];

  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.is_verified) return res.status(400).json({ error: 'Already verified' });
  if (user.otp_code !== code) return res.status(400).json({ error: 'Invalid code' });
  if (new Date() > new Date(user.otp_expires_at)) return res.status(400).json({ error: 'Code expired' });

  await pool.query(
    'UPDATE users SET is_verified = true, otp_code = NULL, otp_expires_at = NULL WHERE id = $1',
    [user.id],
  );

  const token = signToken(user);

  res.cookie('access_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ message: 'Email verified', access_token: token, user: { id: user.id, username: user.username, email: user.email } });
}

// ── Login ────────────────────────────────────────────────────────────

export async function login(req, res) {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: 'Username/Email and password are required' });
  }

  const isEmail = usernameOrEmail.includes('@');
  const queryText = isEmail
    ? 'SELECT * FROM users WHERE email = $1'
    : 'SELECT * FROM users WHERE username = $1';

  const result = await pool.query(queryText, [usernameOrEmail]);
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!user.is_verified) {
    return res.status(403).json({ error: 'Please verify your email first' });
  }

  const token = signToken(user);

  res.cookie('access_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ access_token: token, user: { id: user.id, username: user.username, email: user.email } });
}

// ── Get Current User ─────────────────────────────────────────────────

export async function getMe(req, res) {
  const result = await pool.query(
    'SELECT id, username, email FROM users WHERE id = $1',
    [req.user.id],
  );
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
}

// ── Forgot Password ──────────────────────────────────────────────────

export async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  // Always return success to prevent email enumeration
  if (!user) return res.json({ message: 'If the email exists, a reset code has been sent.' });

  const otp = generateOtp();
  const otpExpires = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);

  await pool.query(
    'UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3',
    [otp, otpExpires, user.id],
  );

  try {
    await sendResetEmail(email, otp);
  } catch (err) {
    console.warn('[Auth] Reset email send failed:', err.message);
  }

  const response = { message: 'If the email exists, a reset code has been sent.' };
  if (process.env.NODE_ENV !== 'production') response.dev_otp = otp;

  res.json(response);
}

// ── Reset Password ───────────────────────────────────────────────────

export async function resetPassword(req, res) {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code, and new password are required' });
  }

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.otp_code !== code) return res.status(400).json({ error: 'Invalid code' });
  if (new Date() > new Date(user.otp_expires_at)) return res.status(400).json({ error: 'Code expired' });

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await pool.query(
    'UPDATE users SET password = $1, otp_code = NULL, otp_expires_at = NULL WHERE id = $2',
    [hashedPassword, user.id],
  );

  res.json({ message: 'Password reset successful. You can now log in.' });
}

// ── Logout ───────────────────────────────────────────────────────────

export async function logout(req, res) {
  res.clearCookie('access_token');
  res.json({ message: 'Logged out' });
}

// ── Check Username Availability ──────────────────────────────────────

export async function checkUsername(req, res) {
  const { username } = req.query;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username query parameter is required' });
  }

  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return res.status(200).json({ available: false, reason: 'Must be at least 3 characters' });
  }

  const alphanumeric = /^[a-zA-Z0-9_]+$/;
  if (!alphanumeric.test(trimmed)) {
    return res.status(200).json({ available: false, reason: 'Only letters, numbers, and underscores allowed' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [trimmed],
    );
    if (existing.rows.length > 0) {
      return res.json({ available: false, reason: 'Username is already taken' });
    }
    return res.json({ available: true });
  } catch (err) {
    console.error('[Auth] Username check query failed:', err.message);
    return res.status(500).json({ error: 'Database query error' });
  }
}
