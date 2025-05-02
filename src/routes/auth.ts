import { Router } from 'express';
import authController from '../controllers/authController';
import verifyToken from '../middleware/authMiddleware';

const router = Router();

// Register route
router.post('/register', authController.register);

// Login route
router.post('/login', authController.login);

router.get('/profile', verifyToken, authController.getProfile);

router.post('/refresh-token', authController.refreshToken);

// Forgot password route
router.post('/forgot-password', authController.forgotPassword);

router.post('/verify', authController.verifyEmail);

router.post('/resend-otp', authController.resendOtp);

// Reset password route
router.post('/reset/:token', authController.resetPassword);

export default router;