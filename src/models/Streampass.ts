import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface for a Streampass document.
 * - Represents a user's access/pass to watch a specific event (could be a gift).
 * - Tracks session state for live streaming (inSession, sessionToken, lastActive) and conversion/usage flags.
 */
export interface IStreampass extends Document {
    user: mongoose.Types.ObjectId;
    email: string;
    firstName: string;
    event: mongoose.Types.ObjectId;
    paymentMethod: 'flutterwave' | 'stripe';
    paymentReference: string;
    createdAt: Date;
    isGift: boolean,
    hasConverted: boolean;
    hasUsed: boolean;
    inSession?: boolean;
    sessionToken?: string;
    lastActive?: Date;
}

/**
 * Mongoose schema for streampasses.
 * - `user` is optional to support gifting to email addresses without existing accounts.
 * - Session fields (`inSession`, `sessionToken`, `lastActive`) are used to control concurrent streaming sessions.
 * - `hasConverted`/`hasUsed` track whether a gifted streampass was converted to a user account and whether it has been consumed.
 */
const StreampassSchema = new Schema<IStreampass>({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    firstName: { type: String },
    email: { type: String},
    sessionToken: { type: String },
    lastActive: { type: Date },
    isGift: { type: Boolean, default: false },
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    paymentMethod: { type: String, enum: ['flutterwave', 'stripe'], required: true },
    paymentReference: { type: String, required: true },
    inSession: { type: Boolean, default: false },
    hasConverted: { type: Boolean, default: false },
    hasUsed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

/**
 * Streampass model exported for creating and querying user streampasses.
 */
export default mongoose.model<IStreampass>('Streampass', StreampassSchema);