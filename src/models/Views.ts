import mongoose, { Schema, Document } from 'mongoose';

export interface IViews extends Document {
    user: mongoose.Types.ObjectId;
    event: mongoose.Types.ObjectId;
    streampass: mongoose.Types.ObjectId;
}

const ViewsSchema = new Schema<IViews>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    streampass: { type: Schema.Types.ObjectId, ref: 'Streampass', required: true },
}, { timestamps: true });

export default mongoose.model<IViews>('Views', ViewsSchema);