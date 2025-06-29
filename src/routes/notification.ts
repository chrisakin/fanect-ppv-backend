import express from 'express';
import authMiddleware from '../middleware/authMiddleware';
import notificationController from '../controllers/notificationController';

const router = express.Router();

router.post('/token', authMiddleware, notificationController.saveToken);
router.post('/verify-token', notificationController.verifyToken);
router.get('/', authMiddleware, notificationController.getNotifications);
router.post('/send', authMiddleware, notificationController.sendNotification);
router.patch('/:notificationId/read', authMiddleware, notificationController.markAsRead);
router.patch('/mark-all-read', authMiddleware, notificationController.markAllRead)

export default router;