import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface representing an EventLocation document.
 * - Associates an `Event` with a textual `location` (e.g., venue or city).
 */
export interface IEventLocation extends Document {
    event: mongoose.Types.ObjectId;
    location: string;
    createdAt: Date;
}

/**
 * Mongoose schema for event locations.
 * - Stores a reference to the `Event` and a simple `location` string.
 * - Uses timestamps so `createdAt`/`updatedAt` are managed automatically.
 */
const EventLocationSchema = new Schema<IEventLocation>({
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    location: { type: String },
    createdAt: { type: Date, default: Date.now }
},
{ timestamps: true });

/**
 * Model for EventLocation used to persist and query event location information.
 */
export default mongoose.model<IEventLocation>('EventLocation', EventLocationSchema);