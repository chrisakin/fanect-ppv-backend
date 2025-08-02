import { Router } from 'express';
import authController from '../../controllers/admin/adminAuthController';
import verifyToken from '../../middleware/adminAuthMiddleware';
import { exchangeAuthCode } from '../../middleware/googleTokenMiddleware';

const router = Router();

// Register route
router.post('/register', authController.register);

// Login route
router.post('/login', authController.login);

router.post('/logout', verifyToken, authController.logout);

router.post('/change-password', verifyToken, authController.changePassword);

router.post('/google', exchangeAuthCode, authController.googleAuth);
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
router.post('/create-admin', authController.createAdmin);
router.get('/get-all-admin', verifyToken, authController.getAllAdmin)
router.get('/single-admin/:id', verifyToken, authController.getAdminById)
router.put('/unlock-user/:id', verifyToken, authController.unlockUser)
router.put('/lock-user/:id', verifyToken, authController.lockUser)
router.get('/admin-activites/:id', verifyToken, authController.getAdminActivities)
export default router;