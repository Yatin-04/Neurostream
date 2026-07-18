import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'neurostream-dev-secret';

/**
 * Express middleware that verifies the JWT from the Authorization header
 * or httpOnly cookie. Attaches decoded user to req.user.
 */
export default function authenticate(req, res, next) {
  const token =
    req.cookies?.access_token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
