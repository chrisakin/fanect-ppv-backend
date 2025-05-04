import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
    name: string;
    date: Date;
    time: string;
    description: string;
    bannerUrl: string;
    watermarkUrl: string;
    createdBy: mongoose.Types.ObjectId;
}

const EventSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        date: { type: Date, required: true },
        time: { type: String, required: true },
        description: { type: String, required: true },
        bannerUrl: { type: String, required: true },
        watermarkUrl: { type: String, required: true },
        createdBy: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

export default mongoose.model<IEvent>('Event', EventSchema);