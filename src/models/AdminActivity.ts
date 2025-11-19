import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface for AdminActivity documents.
 * - Represents an audit/administrative action performed by an admin user.
 * - `admin` references the `Admin` who performed the action.
 * - `eventData` is a short human-readable description of the activity.
 */
export interface IAdminActivity extends Document {
    admin: mongoose.Types.ObjectId;
    eventData: string;
    component: string;
    createdAt: Date;
    activityType: string;
}

/**
 * Mongoose schema for admin activities.
 * - Uses timestamps so `createdAt` and `updatedAt` are maintained automatically.
 * - Stores a reference to an `Admin` and minimal metadata suitable for audits and analytics.
 */
const AdminActivitySchema = new Schema<IAdminActivity>({
    admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    eventData: {type: String, required: true},
    component: { type: String },
    createdAt: { type: Date, default: Date.now }, 
    activityType: {type: String }
},
{ timestamps: true });

/**
 * AdminActivity model for recording and querying admin actions.
 */
export default mongoose.model<IAdminActivity>('AdminActivity', AdminActivitySchema);