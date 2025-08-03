import mongoose, { Schema, Document } from 'mongoose';

export interface IEventLocation extends Document {
    event: mongoose.Types.ObjectId;
    location: string;
    createdAt: Date;
}

const EventLocationSchema = new Schema<IEventLocation>({
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    location: { type: String },
    createdAt: { type: Date, default: Date.now }
},
{ timestamps: true });

export default mongoose.model<IEventLocation>('EventLocation', EventLocationSchema);