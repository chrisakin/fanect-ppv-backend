import mongoose, { Schema, Document } from 'mongoose';

export interface IActivity extends Document {
    user: mongoose.Types.ObjectId;
    eventData: string;
    component: string;
    createdAt: Date;
    activityType: string;
}

const ActivitySchema = new Schema<IActivity>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventData: {type: String, required: true},
    component: { type: String },
    createdAt: { type: Date, default: Date.now }, 
    activityType: {type: String }
});

export default mongoose.model<IActivity>('Activity', ActivitySchema);