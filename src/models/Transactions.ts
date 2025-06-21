import mongoose, { Schema, Document } from 'mongoose';

export enum TransactionStatus {
    SUCCESSFUL = 'Successful',
    PENDING = 'Pending',
    FAILED = 'Failed'
}

export interface ITransactions extends Document {
    user: mongoose.Types.ObjectId;
    event: mongoose.Types.ObjectId;
    paymentMethod: 'flutterwave' | 'stripe';
    paymentReference: string;
    amount: number;
    createdAt: Date;
    isGift: boolean,
    currency: string;
    status: TransactionStatus
}

const TransactionsSchema = new Schema<ITransactions>({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    isGift: { type: Boolean, default: false },
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    paymentMethod: { type: String, enum: ['flutterwave', 'stripe'], required: true },
    paymentReference: { type: String, required: true },
    currency: { type: String, required: true },
    amount: { type: Number, required: true},
    status: { type: String, default: TransactionStatus.PENDING },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ITransactions>('Transactions', TransactionsSchema);