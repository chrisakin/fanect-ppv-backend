import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface representing a view record.
 * - Records when a `User` views an `Event` either live or as a replay.
 */
export interface IViews extends Document {
    user: mongoose.Types.ObjectId;
    event: mongoose.Types.ObjectId;
    type: "live" | "replay"
}

/**
 * Mongoose schema for view tracking.
 * - Stores a reference to the user and event, and the view `type` ('live'|'replay').
 * - Uses timestamps so `createdAt`/`updatedAt` are maintained automatically.
 */
const ViewsSchema = new Schema<IViews>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    type: { type: String }
}, { timestamps: true });

/**
 * Views model used for recording and querying view metrics.
 */
export default mongoose.model<IViews>('Views', ViewsSchema);