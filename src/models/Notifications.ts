import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface representing a push / in-app notification stored for a user.
 * - `data` holds arbitrary string key/value payloads associated with the notification.
 */
export interface INotification extends Document {
    user: mongoose.Types.ObjectId;
    title: string;
    body: string;
    data: Record<string, string>;
    createdAt: Date;
    read: boolean;
}

/**
 * Mongoose schema for notifications.
 * - Stores title/body, optional payload in `data`, a `read` flag, and a reference to the recipient `User`.
 * - `createdAt` is set automatically; consider enabling `timestamps` if you need `updatedAt` as well.
 */
const NotificationSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: String,
    body: String,
    data: { type: Object, default: {} },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

/**
 * Notification model used to persist and query user notifications (in-app and queued push messages).
 */
export default mongoose.model<INotification>('Notification', NotificationSchema);