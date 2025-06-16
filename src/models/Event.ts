import mongoose, { Schema, Document } from 'mongoose';

export enum Currency {
    USD = 'USD',
    NGN = 'NGN',
    EUR = 'EUR',
    GBP = 'GBP',
    CAD = 'CAD',
    CDS = 'CDS'
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
    published: boolean
    prices: IPrice[];
    haveBroadcastRoom: boolean;
    broadcastSoftware: string;
    scheduledTestDate: Date;
    trailerUrl: string;
    status: EventStatus,
    adminStatus: AdminStatus    
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
        bannerUrl: { type: String, required: true },
        watermarkUrl: { type: String },
        prices: { type: [PriceSchema], default: [] },
        published: { type: Boolean, default: false },
        status: { type: String, default: EventStatus.UPCOMING },
        adminStatus: { type: String, default: AdminStatus.PENDING },
        createdBy: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
        haveBroadcastRoom: { type: Boolean, required: true},
        broadcastSoftware: { type: String, required: true },
        scheduledTestDate: { type: Date, required: true },
        trailerUrl: { type: String },
        updatedBy: { type: mongoose.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

export default mongoose.model<IEvent>('Event', EventSchema);
