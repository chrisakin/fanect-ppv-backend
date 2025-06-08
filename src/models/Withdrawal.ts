import mongoose, { Schema, Document } from 'mongoose';

export interface IWithdrawalDetails extends Document {
    user: mongoose.Types.ObjectId;
    accountNumber: string;
    bankName: string;
    sortCode?: string;
    accountName: string;
    currency: string;
    country: string;
    routingNumber?: string;
    accountType?: string;
}

const WithdrawalDetailsSchema = new Schema<IWithdrawalDetails>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    accountNumber: { type: String, required: true },
    bankName: { type: String, required: true },
    sortCode: { type: String },
    accountName: { type: String, required: true },
    currency: { type: String, required: true },
    country: { type: String, required: true },
    routingNumber: { type: String },
    accountType: { type: String }
}, { timestamps: true });

export default mongoose.model<IWithdrawalDetails>('WithdrawalDetails', WithdrawalDetailsSchema);