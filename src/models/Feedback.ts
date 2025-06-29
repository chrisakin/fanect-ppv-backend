import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedback extends Document {
    user: mongoose.Types.ObjectId;
    userName: string;
    event: mongoose.Types.ObjectId;
    ratings: number; // Use number for ratings
    comments?: string;
    createdAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: {type: String},
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    ratings: { type: Number, required: true, min: 1, max: 5 },
    comments: { type: String },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IFeedback>('Feedback', FeedbackSchema);