import { stat } from 'fs';
import mongoose, { Schema, Document } from 'mongoose';

export enum UserStatus {
    ACTIVE = 'Active',
    INACTIVE = 'Inactive',
}

export interface IUser extends Document {
    username: string;
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
    sessionToken: string | undefined;
    lastLogin?: Date;
    locked?: boolean;
    status?: UserStatus;
}

const UserSchema: Schema = new Schema({
    username: { type: String, required: true },
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
    status: { type: String, enum: Object.values(UserStatus), default: UserStatus.ACTIVE },
    lastLogin: { type: Date, default: Date.now },
    appleId: { type: String },
    locked: { type: Boolean, default: false },
    sessionToken: { type: String }
},
{ timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);