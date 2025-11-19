import admin from 'firebase-admin';
import Notification from '../models/Notifications';
import User from '../models/User';
import { paginateAggregate } from './paginationService';
import serviceAccount from '../config/fanect-ppv-df7d7-firebase-adminsdk-fbsvc-e76319a67d.json';
import mongoose from 'mongoose';

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

/**
 * Saves a device token to the user's record for push notifications.
 * @param {string} userId - The user's ID.
 * @param {string} token - The device token to save.
 * @returns {Promise<any>} The result of the update operation.
 */
export async function saveDeviceToken(userId: string, token: string) {
    // await verifyDeviceToken(token)
    return await User.findByIdAndUpdate(userId, { $addToSet: { deviceTokens: token } });
}

/**
 * Verifies if a device token is valid by sending a test notification.
 * @param {string} token - The device token to verify.
 * @returns {Promise<boolean>} True if the token is valid, false otherwise.
 */
export async function verifyDeviceToken(token: string) {
    try {
        const response = await admin.messaging().send({
            token,
            notification: { title: 'Token Verification', body: 'This is a test.' }
        });
        return !!response;
    } catch (error: any) {
        console.log(error)
        return false;
    }
}

/**
 * Sends a push notification to multiple users and stores the notification in the database.
 * @param {string[]} userIds - Array of user IDs to notify.
 * @param {string} title - Notification title.
 * @param {string} body - Notification body.
 * @param {Record<string, string>} [data={}] - Additional data to send with the notification.
 * @returns {Promise<any>} The response from Firebase messaging.
 */
export async function sendNotificationToUsers(
    userIds: string[],
    title: string,
    body: string,
    data: Record<string, string> = {}
) {
    const users = await User.find({ _id: { $in: userIds } });
    const tokens = users.flatMap(u => u.deviceTokens || []);
    if (tokens.length === 0) return;

    const message = {
        notification: { title, body },
        data,
        tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // Store notification in DB for each user
    for (const userId of userIds) {
        await Notification.create({ user: userId, title, body, data });
    }

    return response;
}

/**
 * Marks a specific notification as read for a user.
 * @param {string} userId - The user's ID.
 * @param {string} notificationId - The notification's ID.
 * @returns {Promise<any>} The updated notification document.
 */
export async function markNotificationAsRead(userId: string, notificationId: string) {
    return Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { $set: { read: true } },
        { new: true }
    );
}

/**
 * Marks all unread notifications as read for a user.
 * @param {string} userId - The user's ID.
 * @returns {Promise<any>} The result of the update operation.
 */
export async function markAllNotificationsAsRead(userId: string) {
    return Notification.updateMany(
        { user: userId, read: false },
        { $set: { read: true } }
    );
}

/**
 * Retrieves paginated notifications for a user, sorted by most recent.
 * @param {string} userId - The user's ID.
 * @param {number} [page=1] - The page number for pagination.
 * @param {number} [limit=10] - The number of notifications per page.
 * @returns {Promise<any>} Paginated notifications.
 */
export async function getUserNotifications(userId: string, page = 1, limit = 10) {
    const pipeline: any = [
        { $match: { user: new mongoose.Types.ObjectId(userId )} },
        { $sort: { createdAt: -1 } }
    ];
    return paginateAggregate(Notification, pipeline, { page, limit });
}