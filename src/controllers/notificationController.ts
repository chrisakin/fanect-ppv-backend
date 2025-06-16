import { Request, Response } from 'express';
import * as fcmService from '../services/fcmService';

class NotificationController {
    async saveToken(req: Request, res: Response) {
        const userId = req.user.id;
        const { fcmToken } = req.body;
        await fcmService.saveDeviceToken(userId, fcmToken);
        res.json({ message: 'Token saved' });
    }

    async verifyToken(req: Request, res: Response) {
        const { token } = req.body;
        const valid = await fcmService.verifyDeviceToken(token);
        res.json({ valid });
    }

    async getNotifications(req: Request, res: Response) {
        const userId = req.user.id;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const result = await fcmService.getUserNotifications(userId, page, limit);
        res.json(result);
    }

    async sendNotification(req: Request, res: Response) {
        const { userIds, title, body, data } = req.body;
        const response = await fcmService.sendNotificationToUsers(userIds, title, body, data);
        res.json({ message: 'Notification sent', response });
    }

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
        res.status(500).json({ message: 'Server error' });
    }
}
}

export default new NotificationController();