import mongoose, { Schema, Document } from 'mongoose';

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

export default mongoose.model<IWithdrawalDetails>('WithdrawalDetails', WithdrawalDetailsSchema);