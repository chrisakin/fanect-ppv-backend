import { Request, Response } from 'express';
import Streampass from '../models/Streampass';
import Event from '../models/Event';
import { verifyFlutterwavePayment } from '../services/flutterwaveService';
import { verifyStripePayment } from '../services/stripeService';
import emailService from '../services/emailService';
import { getOneUser } from '../services/userService';
import mongoose from 'mongoose';
import { paginateAggregate } from '../services/paginationService';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2025-04-30.basil',
});


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

        async getUpcomingTicketedEvents(req: Request, res: Response) {
        try {
            const userId = new mongoose.Types.ObjectId(req.user.id);
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const now = new Date();

            const pipeline: mongoose.PipelineStage[] = [
                { $match: { user: userId } },
                {
                    $lookup: {
                        from: 'events',
                        localField: 'event',
                        foreignField: '_id',
                        as: 'event'
                    }
                },
                { $unwind: '$event' },
                {
                    $addFields: {
                        eventDateTime: {
                            $dateFromString: {
                                dateString: {
                                    $concat: [
                                        { $dateToString: { format: "%Y-%m-%d", date: "$event.date" } },
                                        "T",
                                        { $cond: [
                                            { $eq: [ { $type: "$event.time" }, "string" ] },
                                            "$event.time",
                                            { $dateToString: { format: "%H:%M", date: "$event.time" } }
                                        ]}
                                    ]
                                }
                            }
                        }
                    }
                },
                { $match: { eventDateTime: { $gt: now }, 'event.published': true } },
                { $sort: { eventDateTime: 1 } },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                "$event",
                                { streampassId: "$_id", paymentMethod: "$paymentMethod", paymentReference: "$paymentReference" }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        createdBy: 0,
                        createdAt: 0,
                        updatedAt: 0,
                        published: 0,
                        status: 0,
                        __v: 0
                    }
                }
            ];

            const result = await paginateAggregate(Streampass, pipeline, { page, limit });
            res.status(200).json({ message: 'Upcoming events gotten successfully', ...result });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    async getLiveTicketedEvents(req: Request, res: Response) {
        try {
            const userId = new mongoose.Types.ObjectId(req.user.id);
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const now = new Date();
            const startOfDay = new Date(now.setHours(0, 0, 0, 0));
            const endOfDay = new Date(now.setHours(23, 59, 59, 999));

            const pipeline: mongoose.PipelineStage[] = [
                { $match: { user: userId } },
                {
                    $lookup: {
                        from: 'events',
                        localField: 'event',
                        foreignField: '_id',
                        as: 'event'
                    }
                },
                { $unwind: '$event' },
                {
                    $addFields: {
                        eventDateTime: {
                            $dateFromString: {
                                dateString: {
                                    $concat: [
                                        { $dateToString: { format: "%Y-%m-%d", date: "$event.date" } },
                                        "T",
                                        { $cond: [
                                            { $eq: [ { $type: "$event.time" }, "string" ] },
                                            "$event.time",
                                            { $dateToString: { format: "%H:%M", date: "$event.time" } }
                                        ]}
                                    ]
                                }
                            }
                        }
                    }
                },
                { $match: { eventDateTime: { $gte: startOfDay, $lte: endOfDay }, 'event.published': true } },
                { $sort: { eventDateTime: 1 } },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                "$event",
                                { streampassId: "$_id", paymentMethod: "$paymentMethod", paymentReference: "$paymentReference" }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        createdBy: 0,
                        createdAt: 0,
                        updatedAt: 0,
                        published: 0,
                        status: 0,
                        __v: 0
                    }
                }
            ];

            const result = await paginateAggregate(Streampass, pipeline, { page, limit });
            res.status(200).json({ message: 'Live events gotten successfully', ...result });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    async getPastTicketedEvents(req: Request, res: Response) {
        try {
            const userId = new mongoose.Types.ObjectId(req.user.id);
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const now = new Date();

            const pipeline: mongoose.PipelineStage[] =  [
                { $match: { user: userId } },
                {
                    $lookup: {
                        from: 'events',
                        localField: 'event',
                        foreignField: '_id',
                        as: 'event'
                    }
                },
                { $unwind: '$event' },
                {
                    $addFields: {
                        eventDateTime: {
                            $dateFromString: {
                                dateString: {
                                    $concat: [
                                        { $dateToString: { format: "%Y-%m-%d", date: "$event.date" } },
                                        "T",
                                        { $cond: [
                                            { $eq: [ { $type: "$event.time" }, "string" ] },
                                            "$event.time",
                                            { $dateToString: { format: "%H:%M", date: "$event.time" } }
                                        ]}
                                    ]
                                }
                            }
                        }
                    }
                },
                { $match: { eventDateTime: { $lt: now }, 'event.published': true } },
                { $sort: { eventDateTime: -1 } },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                "$event",
                                { streampassId: "$_id", paymentMethod: "$paymentMethod", paymentReference: "$paymentReference" }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        createdBy: 0,
                        createdAt: 0,
                        updatedAt: 0,
                        published: 0,
                        status: 0,
                        __v: 0
                    }
                }
            ];

            const result = await paginateAggregate(Streampass, pipeline, { page, limit });
            res.status(200).json({ message: 'Past events gotten successfully', ...result });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

        async createStripeCheckoutSession(req: Request, res: Response) {
        try {
            const { eventId } = req.body;
            const event = await Event.findById(eventId) as (typeof Event.prototype & { _id: mongoose.Types.ObjectId });
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }

            // You can add more metadata as needed
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'payment',
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: event.name,
                                description: event.description,
                            },
                            unit_amount: Math.round(Number(event.price) * 100), // price in cents
                        },
                        quantity: 1,
                    },
                ],
                metadata: {
                    eventId: event._id.toString(),
                    userId: req.user.id,
                },
                success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled`,
                customer_email: req.user.email, // optional, if you have the user's email
            });

            res.status(200).json({ url: session.url });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Stripe session creation failed' });
        }
    }
}

export default new StreampassController();