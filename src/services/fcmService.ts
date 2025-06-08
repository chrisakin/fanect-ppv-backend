import admin from 'firebase-admin';
import Notification from '../models/Notifications';
import User from '../models/User';

admin.initializeApp({
    credential: admin.credential.applicationDefault(), // or use cert if you have a service account JSON
});

export async function saveDeviceToken(userId: string, token: string) {
    await User.findByIdAndUpdate(userId, { $addToSet: { deviceTokens: token } });
}

export async function verifyDeviceToken(token: string) {
    try {
        const response = await admin.messaging().send({
            token,
            notification: { title: 'Token Verification', body: 'This is a test.' }
        });
        return !!response;
    } catch {
        return false;
    }
}

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

export async function markNotificationAsRead(userId: string, notificationId: string) {
    return Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { $set: { read: true } },
        { new: true }
    );
}

export async function getUserNotifications(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
        Notification.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Notification.countDocuments({ user: userId })
    ]);
    return {
        notifications,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
}