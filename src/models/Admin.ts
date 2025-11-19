import mongoose, { Schema, Document } from 'mongoose';

/**
 * Roles available for admin users.
 * - `SUPERADMIN`: full access to admin features.
 * - `ASSISTANT`: limited/assistant-level access.
 */
export enum AdminRolesEnum {
    SUPERADMIN = "Super Admin",
    ASSISTANT = "Assistant"
}

/**
 * Possible lifecycle statuses for an admin account.
 */
export enum AdminStatus {
    ACTIVE = 'Active',
    INACTIVE = 'Inactive',
}

/**
 * Interface representing an Admin document.
 * - Includes authentication fields (email, password, refresh/reset tokens),
 *   notification preferences, device tokens, role/permissions, and metadata.
 */
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
    role: AdminRolesEnum;
    permissions: [],
    lastLogin?: Date;
    locked?: boolean;
    status?: AdminStatus;
}

/**
 * Mongoose schema defining the Admin document structure and defaults.
 * - Uses timestamps so `createdAt` and `updatedAt` are managed automatically.
 */
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
    permissions: {type: [String], },
    status: { type: String, enum: Object.values(AdminStatus), default: AdminStatus.ACTIVE },
    lastLogin: { type: Date, default: Date.now },
    locked: { type: Boolean, default: false },

},
{ timestamps: true });

/**
 * Admin model used to perform CRUD operations on admin accounts.
 */
export default mongoose.model<IAdmin>('Admin', AdminSchema);