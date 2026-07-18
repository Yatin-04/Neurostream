import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import {
  register,
  verifyEmail,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  logout,
  checkUsername,
} from '../controller/auth.js';

const router = Router();

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.get('/check-username', checkUsername);
export default router;
