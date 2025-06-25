import mongoose, { Schema, Document } from 'mongoose';

export enum Currency {
    USD = 'USD',
    NGN = 'NGN',
    EUR = 'EUR',
    GBP = 'GBP',
    CAD = 'CAD',
    GHS = 'GHS'
}

export interface IPrice {
    currency: Currency;
    amount: number;
}

export interface IPriceDocument extends IPrice, Document {}

export const PriceSchema = new Schema<IPriceDocument>({
    currency: {
        type: String,
        enum: Object.values(Currency),
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
});
export interface IEvent extends Document {
    name: string;
    date: Date;
    time: string;
    description: string;
    bannerUrl: string;
    watermarkUrl: string;
    createdBy: mongoose.Types.ObjectId;
    updatedBy: mongoose.Types.ObjectId;
    publishedBy: mongoose.Types.ObjectId;
    unpublishedBy: mongoose.Types.ObjectId;
    published: boolean
    prices: IPrice[];
    haveBroadcastRoom: boolean;
    broadcastSoftware: string;
    scheduledTestDate: Date;
    trailerUrl: string;
    status: EventStatus,
    adminStatus: AdminStatus;
    ivsChannelArn: string,
    ivsPlaybackUrl: string, 
    ivsChatRoomArn: string,
    rejectedBy: mongoose.Types.ObjectId;
    startedEventBy: mongoose.Types.ObjectId
    endedEventBy: mongoose.Types.ObjectId
    canWatchSavedStream: boolean
}

export enum EventStatus {
    UPCOMING = 'Upcoming',
    LIVE = 'Live',
    PAST = 'Past'
}

export enum AdminStatus {
    APPROVED = 'Approved',
    PENDING = 'Pending',
    REJECTED = 'Rejected'
}

const EventSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        date: { type: Date, required: true },
        time: { type: String, required: true },
        description: { type: String, required: true },
        bannerUrl: { type: String },
        watermarkUrl: { type: String },
        prices: { type: [PriceSchema], default: [] },
        published: { type: Boolean, default: false },
        status: { type: String, default: EventStatus.UPCOMING },
        adminStatus: { type: String, default: AdminStatus.PENDING },
        createdBy: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
        haveBroadcastRoom: { type: Boolean, required: true},
        canWatchSavedStream: { type: Boolean, default: false},
        broadcastSoftware: { type: String, required: true },
        scheduledTestDate: { type: Date, required: true },
        trailerUrl: { type: String },
        ivsChannelArn: { type: String },
        ivsPlaybackUrl: { type: String },
        ivsChatRoomArn: { type: String },
        updatedBy: { type: mongoose.Types.ObjectId, ref: 'User' },
        publishedBy: { type: mongoose.Types.ObjectId, ref: 'Admin' },
        unpublishedBy: { type: mongoose.Types.ObjectId, ref: 'Admin' },
        rejectedBy: { type: mongoose.Types.ObjectId, ref: 'Admin' },
        startedEventBy: { type: mongoose.Types.ObjectId, ref: 'Admin' },
        endedEventBy: { type: mongoose.Types.ObjectId, ref: 'Admin' },
    },
    { timestamps: true }
);

export default mongoose.model<IEvent>('Event', EventSchema);
