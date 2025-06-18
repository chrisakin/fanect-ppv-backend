import mongoose, { Schema, Document } from 'mongoose';

export interface IStreampass extends Document {
    user: mongoose.Types.ObjectId;
    email: string;
    firstName: string;
    event: mongoose.Types.ObjectId;
    paymentMethod: 'flutterwave' | 'stripe';
    paymentReference: string;
    createdAt: Date;
    isGift: boolean
}

const StreampassSchema = new Schema<IStreampass>({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    firstName: { type: String },
    email: { type: String},
    isGift: { type: Boolean },
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    paymentMethod: { type: String, enum: ['flutterwave', 'stripe'], required: true },
    paymentReference: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IStreampass>('Streampass', StreampassSchema);