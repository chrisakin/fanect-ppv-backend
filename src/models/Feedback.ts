import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedback extends Document {
    user: mongoose.Types.ObjectId;
    event: mongoose.Types.ObjectId;
    ratings: number; // Use number for ratings
    comment?: string;
    createdAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    ratings: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IFeedback>('Feedback', FeedbackSchema);