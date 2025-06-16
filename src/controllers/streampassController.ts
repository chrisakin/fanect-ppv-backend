import { Request, Response } from 'express';
import Streampass from '../models/Streampass';
import Event, { EventStatus } from '../models/Event';
import { flutterwaveInitialization, getAllBanks, resolveBankAccount, verifyFlutterwavePayment } from '../services/flutterwaveService';
import { createStripeCheckoutSession, verifyStripePayment } from '../services/stripeService';
import emailService from '../services/emailService';
import { getOneUser } from '../services/userService';
import mongoose from 'mongoose';
import { paginateAggregate } from '../services/paginationService';
import Stripe from 'stripe';
import axios from 'axios';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2025-04-30.basil',
});


class StreampassController {
    async buyStreampass(req: Request, res: Response) {
        const { paymentMethod, paymentReference } = req.body;
        try {
            // Verify payment
            let paymentVerified;
            if (paymentMethod === 'flutterwave') {
                paymentVerified = await verifyFlutterwavePayment(paymentReference );
            } else if (paymentMethod === 'stripe') {
                paymentVerified = await verifyStripePayment(paymentReference );
            } else {
                return res.status(400).json({ message: 'Invalid payment method' });
            }

            if (!paymentVerified) {
                return res.status(400).json({ message: 'Payment verification failed' });
            }
            const {success, eventId, userId, amount} = paymentVerified
            if(!success) return res.status(400).json({ message: 'Payment not verified' });
            const verify = await Streampass.findOne({paymentMethod, paymentReference, event: eventId, user:userId})
            if(verify) return res.status(201).json({ message: 'Streampass purchased successfully', streampass: verify });
            const event = await Event.findById(eventId);
            if (!event) return res.status(404).json({ message: 'Event not found' });
            //const expectedAmount = paymentMethod == 'stripe' ? Math.round(Number(event.price) * 100): event.price;
            //if(amount != expectedAmount) return res.status(400).json({ message: 'Payment Not verified. Please contact customer care.' });
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
                                { streampassId: "$_id", paymentMethod: "$paymentMethod", paymentReference: "$paymentReference", eventDateTime: "$eventDateTime" }
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
                { $match: { 'event.status': EventStatus.LIVE, 'event.published': true } },
                { $sort: { eventDateTime: 1 } },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                "$event",
                                { streampassId: "$_id", paymentMethod: "$paymentMethod", paymentReference: "$paymentReference", eventDateTime: "$eventDateTime" }
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
                { $match: { 'event.status': EventStatus.PAST, 'event.published': true } },
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
            const { eventId, currency, friends } = req.body;
            const event = await Event.findById(eventId) as (typeof Event.prototype & { _id: mongoose.Types.ObjectId });
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }
            const user = {id: req.user.id, email: req.user.email}
            const verifyStreamPass = await Streampass.findOne({event:eventId, user:req.user.id})
            if(verifyStreamPass && (!friends || friends.length == 0)) {
                return res.status(404).json({ message: 'You already have a streampass for this event' });
            }
            const session = await createStripeCheckoutSession(currency, event, user, friends)
            res.status(200).json({ url: session.url });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Stripe session creation failed' });
        }
    }

    async flutterwaveInitialization(req: Request, res: Response) {
        try {
           const { eventId, currency, friends } = req.body;
            const event = await Event.findById(eventId) as (typeof Event.prototype & { _id: mongoose.Types.ObjectId });
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }
            const user = {id: req.user.id, email: req.user.email, name: req.user.name}
            const verifyStreamPass = await Streampass.findOne({event:eventId, user:req.user.id})
            if(verifyStreamPass && (!friends || friends.length == 0)) {
                return res.status(404).json({ message: 'You already have a streampass for this event' });
            }
             const response = await flutterwaveInitialization(event, currency, user, friends)
                res.status(200).json({ link: response.data.data.link });
            } catch (error) {
            
            }
    }

    async getUserStreampassForEvent(req: Request, res: Response) {
    try {
        const userId = req.user.id;
        const { eventId } = req.params;

        const streampass = await Streampass.findOne({ user: userId, event: eventId }).select('-paymentMethod -paymentReference -createdAt -user')
            .populate({
                path: 'event',
                select: '-createdBy -createdAt -updatedAt -published -status -__v'
            })
        if (!streampass) {
            return res.status(404).json({ message: 'Streampass not found for this user and event' });
        }

        res.status(200).json({ message: 'Streampass found', streampass });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

async getBanks(req: Request, res: Response) {
        try {
            const country = req.query.country as string || 'NG';
            const data = await getAllBanks(country);
            res.status(200).json({ banks: data.data });
        } catch (error) {
            res.status(500).json({ message: 'Unable to fetch banks' });
        }
    }

    async resolveAccount(req: Request, res: Response) {
        try {
            const { account_number, bank_code } = req.body;
            if (!account_number || !bank_code) {
                return res.status(400).json({ message: 'account_number and bank_code are required' });
            }
            const data = await resolveBankAccount(account_number, bank_code);
            res.status(200).json({ account: data.data });
        } catch (error) {
            res.status(500).json({ message: 'Unable to resolve bank account' });
        }
    }
}

export default new StreampassController();