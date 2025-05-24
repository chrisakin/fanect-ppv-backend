import { Request, Response } from 'express';
import Streampass from '../models/Streampass';
import Event from '../models/Event';
import { verifyFlutterwavePayment } from '../services/flutterwaveService';
import { verifyStripePayment } from '../services/stripeService';
import emailService from '../services/emailService';
import { getOneUser } from '../services/userService';


class StreampassController {
    async buyStreampass(req: Request, res: Response) {
        const userId = req.user.id;
        const { eventId, paymentMethod, paymentReference } = req.body;

        try {
            const event = await Event.findById(eventId);
            if (!event) return res.status(404).json({ message: 'Event not found' });

            // Verify payment
            let paymentVerified = false;
            if (paymentMethod === 'flutterwave') {
                paymentVerified = await verifyFlutterwavePayment(paymentReference, Number(event.price));
            } else if (paymentMethod === 'stripe') {
                paymentVerified = await verifyStripePayment(paymentReference, Number(event.price));
            } else {
                return res.status(400).json({ message: 'Invalid payment method' });
            }

            if (!paymentVerified) {
                return res.status(400).json({ message: 'Payment verification failed' });
            }

            // Create streampass
            const streampass = await Streampass.create({
                user: userId,
                event: eventId,
                paymentMethod,
                paymentReference
            });

            const user = await getOneUser(userId, res);

            if (!user || !user.email) {
                return res.status(404).json({ message: 'User not found or email missing' });
            }

            // Send email to user
            await emailService.sendEmail(
            user.email,
            'Event Streampass',
            'emailVerification',
            { code: streampass }
            );

            res.status(201).json({ message: 'Streampass purchased successfully', streampass });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}

export default new StreampassController();