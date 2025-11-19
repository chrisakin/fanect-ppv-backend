import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface representing stored withdrawal/bank details for a user.
 * - `user` references the account owner.
 * - Fields like `accountNumber`, `accountName`, and `bankName` are required for payouts.
 */
export interface IWithdrawalDetails extends Document {
    user: mongoose.Types.ObjectId;
    bankName: string;
    bankType: string;
    bankRoutingNumber: string;
    address: string;
    accountNumber: string;
    accountName: string;
    currency: string;
}

/**
 * Mongoose schema for withdrawal details.
 * - Stores payout/bank information for a user. Timestamps are enabled so `createdAt` and `updatedAt` are recorded.
 * - The schema intentionally keeps fields simple (strings) — if you need strict bank validation consider adding
 *   additional validators or normalizing data at the service layer.
 */
const WithdrawalDetailsSchema = new Schema<IWithdrawalDetails>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    accountNumber: { type: String, required: true },
    bankName: { type: String, required: true },
    bankType: { type: String },
    accountName: { type: String, required: true },
    currency: { type: String },
    address: { type: String },
    bankRoutingNumber: { type: String },
}, { timestamps: true });

/**
 * Model for withdrawal details used to persist and query user payout information.
 */
export default mongoose.model<IWithdrawalDetails>('WithdrawalDetails', WithdrawalDetailsSchema);