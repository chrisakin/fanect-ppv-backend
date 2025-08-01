import mongoose, { Schema, Document } from 'mongoose';

export enum AdminRolesEnum {
    SUPERADMIN = "Superadmin",
    ASSISTANT = "Assistant"
}
export interface IAdmin extends Document {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    refreshToken: string | undefined;
    resetPasswordToken: string | undefined;
    resetPasswordExpires: number | undefined;
    verificationCode: string | undefined;
    verificationCodeExpires: number | undefined;
    isVerified: boolean;
    appNotifLiveStreamBegins: boolean;
    appNotifLiveStreamEnds: boolean;
    emailNotifLiveStreamBegins: boolean;
    emailNotifLiveStreamEnds: boolean;
    deviceTokens: string[];
    isDeleted?: boolean;
    appleId?: string;
    roles: string;
    permissions: []
}

const AdminSchema: Schema = new Schema({
    email: { type: String, required: true },
    password: { type: String },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    refreshToken: { type: String, default: '' },
    resetPasswordToken: { type: String, default: '' },
    resetPasswordExpires: { type: Number, default: 0 },
    verificationCode: { type: String, default: '' },
    verificationCodeExpires: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    appNotifLiveStreamBegins: { type: Boolean, default: true },
    appNotifLiveStreamEnds: { type: Boolean, default: true },
    emailNotifLiveStreamBegins: { type: Boolean, default: true },
    emailNotifLiveStreamEnds: { type: Boolean, default: true },
    deviceTokens: { type: [String], default: [] },
    isDeleted: { type: Boolean, default: false },
    appleId: { type: String },
    role: { type: String },
    assistantRole: { type: String },
    permissions: {type: [String], }
},
{ timestamps: true });

export default mongoose.model<IAdmin>('Admin', AdminSchema);