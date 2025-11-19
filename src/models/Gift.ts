import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface representing a Gift document.
 * - `sender`: the user who purchased/sent the gift.
 * - `user`: optional user account of the receiver (populated if the receiver has an account).
 * - `receiversEmail`: the email address the gift was sent to.
 * - `hasConverted`: indicates whether the gift has been claimed/converted into a streampass.
 */
export interface IGift extends Document {
    sender: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    event: mongoose.Types.ObjectId;
    receiversEmail: string;
    paymentMethod: 'flutterwave' | 'stripe';
    paymentReference: string;
    createdAt: Date;
    hasConverted: boolean;
}

/**
 * Mongoose schema for gifts sent by users.
 * - Records sender, optional receiver mapping, associated event, and payment metadata.
 */
const GiftSchema = new Schema<IGift>({
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    receiversEmail: { type: String, required: true },
    paymentMethod: { type: String, enum: ['flutterwave', 'stripe'], required: true },
    paymentReference: { type: String, required: true },
    hasConverted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

/**
 * Gift model for persisting and querying gifted streampass metadata.
 */
export default mongoose.model<IGift>('Gift', GiftSchema);