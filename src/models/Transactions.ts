import mongoose, { Schema, Document } from 'mongoose';

/**
 * Status values for a payment transaction.
 * - `SUCCESSFUL`: payment completed and recorded
 * - `PENDING`: awaiting confirmation/verification
 * - `FAILED`: payment failed or was rolled back
 */
export enum TransactionStatus {
    SUCCESSFUL = 'Successful',
    PENDING = 'Pending',
    FAILED = 'Failed'
}

/**
 * Interface representing a Transactions document.
 * - Tracks payment records for streampass purchases, gifts, and other event payments.
 */
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

/**
 * Mongoose schema for transaction records.
 * - Stores user/event references, payment gateway metadata, currency and amount, and a status flag.
 */
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

/**
 * Transactions model used to persist and query payment transactions in the system.
 */
export default mongoose.model<ITransactions>('Transactions', TransactionsSchema);