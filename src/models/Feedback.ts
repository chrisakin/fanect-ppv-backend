import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface for a Feedback document.
 * - Represents user-submitted feedback for an event including a numeric rating and optional comments.
 */
export interface IFeedback extends Document {
    user: mongoose.Types.ObjectId;
    userName: string;
    event: mongoose.Types.ObjectId;
    ratings: number; // Use number for ratings (1-5)
    comments?: string;
    createdAt: Date;
}

/**
 * Mongoose schema for Feedback documents.
 * - Stores a reference to the `User` and the `Event`, a numeric `ratings` value (1-5),
 *   optional `comments`, and `createdAt` timestamp. Uses `timestamps` for automatic date fields.
 */
const FeedbackSchema = new Schema<IFeedback>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: {type: String},
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    ratings: { type: Number, required: true, min: 1, max: 5 },
    comments: { type: String },
    createdAt: { type: Date, default: Date.now }
},
{ timestamps: true });

/**
 * Feedback model exported for creating and querying user feedback on events.
 */
export default mongoose.model<IFeedback>('Feedback', FeedbackSchema);