import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Gift from '../models/Gift';
import Streampass from '../models/Streampass';
import Event from '../models/Event';
import { verifyFlutterwavePayment } from '../services/flutterwaveService';
import { verifyStripePayment } from '../services/stripeService';
import User from '../models/User';
import emailService from '../services/emailService';

class GiftController {
    async giftStreampass(req: Request, res: Response) {
        const senderId = req.user.id;
        const { eventId, paymentMethod, paymentReference, email, firstName, lastName } = req.body;
        const emails = Array.isArray(email) ? email : [email];
        if (!Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({ message: 'Emails are required' });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const event = await Event.findById(eventId).session(session);
            if (!event) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ message: 'Event not found' });
            }

            const totalAmount = Number(event.prices) * emails.length;

            let paymentVerified = false;
            if (paymentMethod === 'flutterwave') {
                paymentVerified = await verifyFlutterwavePayment(paymentReference);
            } else if (paymentMethod === 'stripe') {
                paymentVerified = await verifyStripePayment(paymentReference);
            } else {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: 'Invalid payment method' });
            }

            if (!paymentVerified) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: 'Payment verification failed' });
            }

            // Save the gift
            const gift = await Gift.create([{
                sender: senderId,
                event: eventId,
                emails,
                paymentMethod,
                paymentReference
            }], { session });

            // For each email, create a streampass (attach to user if exists, else leave user null and attach email)
            const streampasses = [];
            for (const email of emails) {
                let user = await User.findOne({ email }).session(session);
                const streampass = await Streampass.create([{
                    user: user ? user._id : undefined,
                    event: eventId,
                    paymentMethod,
                    paymentReference,
                    giftedEmail: email, // Add this field to Streampass model if not present
                }], { session });
                // Send email outside transaction (after commit)
                streampasses.push(streampass[0]);
            }

            await session.commitTransaction();
            session.endSession();

            // Send emails after transaction is committed
            for (let i = 0; i < emails.length; i++) {
                await emailService.sendEmail(
                    emails[i],
                    'Event Streampass',
                    'emailVerification',
                    { code: streampasses[i], _id: streampasses[i]._id, firstName, lastName, eventTitle: event.name }
                );
            }

            res.status(201).json({ message: 'Gifts sent successfully', gift: gift[0], streampasses });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}

//Gift sender Recipt
// {
//   giverName: 'John Doe',
//   receiverName: 'Jane Smith',
//   eventName: 'Live Concert with Burna',
//   eventDate: 'June 20, 2025',
//   giftReference: 'FANGIFT20250612',
//   paymentDate: 'June 15, 2025',
//   amount: 2500,
//   year: 2025
// }

// Gift Receiver Email
// {
//   giverName: 'John Doe',
//   receiverName: 'Jane Smith',
//   eventName: 'Live Concert with Burna',
//   eventDate: 'June 20, 2025',
//   giftReference: 'FANGIFT20250612',
//   accessUrl: 'https://fanect.com/events/abc123',
//   amount: 2500,
//   year: 2025
// }

export default new GiftController();