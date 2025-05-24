import mongoose, { Schema, Document } from 'mongoose';

export interface IGift extends Document {
    sender: mongoose.Types.ObjectId;
    event: mongoose.Types.ObjectId;
    emails: string[];
    paymentMethod: 'flutterwave' | 'stripe';
    paymentReference: string;
    createdAt: Date;
}

const GiftSchema = new Schema<IGift>({
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    emails: [{ type: String, required: true }],
    paymentMethod: { type: String, enum: ['flutterwave', 'stripe'], required: true },
    paymentReference: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IGift>('Gift', GiftSchema);