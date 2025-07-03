import { Router } from 'express';
import authController from '../controllers/authController';
import verifyToken from '../middleware/authMiddleware';
import { exchangeAuthCode } from '../middleware/googleTokenMiddleware';

const router = Router();

// Register route
router.post('/register', authController.register);

// Login route
router.post('/login', authController.login);

router.post('/logout', verifyToken, authController.logout);

router.post('/change-password', verifyToken, authController.changePassword);

router.post('/google', exchangeAuthCode, authController.googleAuth);
router.post('/google-mobile', authController.googleAuth);
router.post('/apple', authController.appleAuth);

router.get('/profile', verifyToken, authController.getProfile);

router.put('/profile', verifyToken, authController.updateProfile);

router.post('/refresh-token', authController.refreshToken);

// Verify Email route
router.post('/verify', authController.verifyEmail);
router.post('/resend-otp', authController.resendOtp);

// Reset password route
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset/:token', authController.resetPassword);
// In your auth routes file
router.delete('/delete-account', verifyToken, authController.deleteAccount);

export default router;
