import mongoose, { Schema, Document } from 'mongoose';

/**
 * Activity document interface.
 * - Represents a single user activity/event in the system (e.g., purchase, stream session start).
 * - `user` links to the `User` that performed the activity.
 * - `eventData` is a short descriptive string for display or audit purposes.
 * - `component` groups activities by subsystem (e.g., 'streampass', 'payment').
 * - `activityType` is an application-defined action identifier (e.g., 'buystreampass').
 */
export interface IActivity extends Document {
    user: mongoose.Types.ObjectId;
    eventData: string;
    component: string;
    createdAt: Date;
    activityType: string;
}

/**
 * Mongoose schema for Activity documents.
 * - Uses timestamps so `createdAt`/`updatedAt` are maintained automatically.
 * - Stores a reference to `User` and simple metadata for analytics/audit trails.
 */
const ActivitySchema = new Schema<IActivity>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventData: {type: String, required: true},
    component: { type: String },
    createdAt: { type: Date, default: Date.now }, 
    activityType: {type: String }
},
{ timestamps: true });

/**
 * Activity model exported for use by services that record or query user activities.
 */
export default mongoose.model<IActivity>('Activity', ActivitySchema);