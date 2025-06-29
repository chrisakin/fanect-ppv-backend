import mongoose, { Schema, Document } from 'mongoose';

export interface IViews extends Document {
    user: mongoose.Types.ObjectId;
    event: mongoose.Types.ObjectId;
    type: "live" | "replay"
}

const ViewsSchema = new Schema<IViews>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    type: { type: String }
}, { timestamps: true });

export default mongoose.model<IViews>('Views', ViewsSchema);