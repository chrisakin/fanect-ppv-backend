import { Request, Response } from 'express';
import * as fcmService from '../services/fcmService';

/**
 * Controller responsible for device token management and user notifications.
 * - Persists FCM tokens, verifies tokens, retrieves user notifications, and marks notifications read.
 */
class NotificationController {
    /**
     * Save an FCM device token for the authenticated user.
     * - Expects `req.body.fcmToken` and `req.user.id` to persist the mapping.
     * @param req Express request with `body.fcmToken` and authenticated `user.id`
     * @param res Express response with success message
     */
    async saveToken(req: Request, res: Response) {
        const userId = req.user.id;
        const { fcmToken } = req.body;
        await fcmService.saveDeviceToken(userId, fcmToken);
        res.json({ message: 'Token saved' });
    }

    /**
     * Verify whether an FCM device token is valid/registered.
     * - Expects `req.body.token` and returns `{ valid: boolean }`.
     * @param req Express request with `body.token`
     * @param res Express response indicating validity
     */
    async verifyToken(req: Request, res: Response) {
        const { token } = req.body;
        const valid = await fcmService.verifyDeviceToken(token);
        res.json({ valid });
    }

    /**
     * Retrieve paginated notifications for the authenticated user.
     * - Supports `page` and `limit` query parameters.
     * @param req Express request with `user.id` and optional `query.page`, `query.limit`
     * @param res Express response with paginated notifications
     */
    async getNotifications(req: Request, res: Response) {
        const userId = req.user.id;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const result = await fcmService.getUserNotifications(userId, page, limit);
        res.json(result);
    }

    /**
     * Send a push notification to specific users.
     * - Expects `userIds`, `title`, `body`, and optional `data` in `req.body`.
     * @param req Express request with `body.userIds`, `body.title`, `body.body`, `body.data`
     * @param res Express response with sending result
     */
    async sendNotification(req: Request, res: Response) {
        const { userIds, title, body, data } = req.body;
        const response = await fcmService.sendNotificationToUsers(userIds, title, body, data);
        res.json({ message: 'Notification sent', response });
    }

    /**
     * Mark a single notification as read for the authenticated user.
     * - Uses `params.notificationId` to identify the notification.
     * @param req Express request with `user.id` and `params.notificationId`
     * @param res Express response indicating the updated notification or 404 if not found
     */
    async markAsRead(req: Request, res: Response) {
        const userId = req.user.id;
        const { notificationId } = req.params;
        try {
            const notification = await fcmService.markNotificationAsRead(userId, notificationId);
            if (!notification) {
                return res.status(404).json({ message: 'Notification not found' });
            }
            res.json({ message: 'Notification marked as read', notification });
        } catch (error) {
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    /**
     * Mark all notifications as read for the authenticated user.
     * @param req Express request with `user.id`
     * @param res Express response indicating success or 404 if nothing was updated
     */
    async markAllRead(req: Request, res: Response) {
        const userId = req.user.id;
        try {
            const notification = await fcmService.markAllNotificationsAsRead(userId);
            if (!notification) {
                return res.status(404).json({ message: 'Notification not found' });
            }
            res.json({ message: 'Notification marked as read', notification });
        } catch (error) {
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }
}

export default new NotificationController();