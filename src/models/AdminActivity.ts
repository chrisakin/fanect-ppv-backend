import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminActivity extends Document {
    admin: mongoose.Types.ObjectId;
    eventData: string;
    component: string;
    createdAt: Date;
    activityType: string;
}

const AdminActivitySchema = new Schema<IAdminActivity>({
    admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    eventData: {type: String, required: true},
    component: { type: String },
    createdAt: { type: Date, default: Date.now }, 
    activityType: {type: String }
},
{ timestamps: true });

export default mongoose.model<IAdminActivity>('AdminActivity', AdminActivitySchema);