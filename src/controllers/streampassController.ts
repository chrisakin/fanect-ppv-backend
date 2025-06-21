import { Request, Response } from 'express';
import Streampass from '../models/Streampass';
import Event, { EventStatus } from '../models/Event';
import { flutterwaveInitialization, getAllBanks, resolveBankAccount, verifyFlutterwavePayment } from '../services/flutterwaveService';
import { createStripeCheckoutSession, verifyStripePayment } from '../services/stripeService';
import emailService from '../services/emailService';
import { getOneUser } from '../services/userService';
import mongoose from 'mongoose';
import { paginateAggregate } from '../services/paginationService';
import User from '../models/User';
import Gift from '../models/Gift';
import Transactions, { TransactionStatus } from '../models/Transactions';

class StreampassController {

//     async buyStreampass(req: Request, res: Response) {
//     const { paymentMethod, paymentReference } = req.body;
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         let isGift: boolean = false
//         let paymentVerified;
//         if (paymentMethod === 'flutterwave') {
//             paymentVerified = await verifyFlutterwavePayment(paymentReference);
//         } else if (paymentMethod === 'stripe') {
//             paymentVerified = await verifyStripePayment(paymentReference);
//         } else {
//             return res.status(400).json({ message: 'Invalid payment method' });
//         }

//         if (!paymentVerified) {
//             return res.status(400).json({ message: 'Payment verification failed' });
//         }

//         const { success, eventId, userId, amount, friends, currency } = paymentVerified;
//         if (!success) return res.status(400).json({ message: 'Payment not verified' });

//         const existing = await Streampass.findOne({ paymentMethod, paymentReference, event: eventId, user: userId });
//         if (existing) {
//             return res.status(201).json({ message: 'Streampass purchased successfully', streampass: existing });
//         }

//         const event = await Event.findById(eventId).session(session);
//         if (!event) return res.status(404).json({ message: 'Event not found' });

//         const priceObj = event.prices.find((p: any) => p.currency === currency);
//         const expectedAmount = paymentMethod === 'stripe' ? Math.round(Number(priceObj?.amount) * 100) : priceObj?.amount;
//         if (amount != expectedAmount) return res.status(400).json({ message: 'Payment Not verified. Please contact customer care.' });

//         const user = await getOneUser(userId, res);
//         if (!user || !user.email) {
//             return res.status(404).json({ message: 'User not found or email missing' });
//         }

//         let streams;

//         if (friends && friends.length > 0) {
//             const emails = friends.map((f: { email: string }) => f.email.toLowerCase());
//             const users = await User.find({ email: { $in: emails } }).select('_id email').session(session);
//             const userMap = new Map(users.map(u => [u.email.toLowerCase(), u._id]));
//             const streampasses = [];
//             const gifts = [];
//             isGift = true

//             for (const friend of friends) {
//                 const friendUserId = userMap.get(friend.email.toLowerCase());

//                 streampasses.push({
//                     event: eventId,
//                     paymentMethod,
//                     paymentReference,
//                     firstName: friend.firstName,
//                     email: friend.email,
//                     isGift: true,
//                     ...(friendUserId ? { user: friendUserId, hasConverted: true } : {})
//                 });

//                 gifts.push({
//                     sender: user.id,
//                     receiversEmail: friend.email,
//                     receiverFirstName: friend.firstName,
//                     hasUsed: false,
//                     paymentMethod,
//                     paymentReference,
//                     event: eventId,
//                     ...(friendUserId ? { user: friendUserId, hasConverted: true } : {})
//                 });
//             }

//             await Streampass.insertMany(streampasses, { session });
//             await Gift.insertMany(gifts, { session });

//             streams = { event: eventId, user: userId };

//             await Promise.all(
//                 streampasses.map(pass => {
//                     return emailService.sendEmail(
//                         pass.email,
//                         'You received a gift Streampass!',
//                         'giftStreamPass',
//                         {
//                             receiverName: pass.firstName,
//                             eventName: event.name,
//                             eventDate: new Date(event.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
//                             eventTime: event.time,
//                             giverName: user.firstName,
//                             accessUrl: `${process.env.FRONTEND_URL}`,
//                             year: new Date().getFullYear()
//                         }
//                     );
//                 })
//             );

//             await emailService.sendEmail(
//                 user.email,
//                 'You purchased a gift Streampass!',
//                 'giftSenderReceipt',
//                 {
//                     giverName: user.firstName,
//                     eventName: event.name,
//                     eventDate: new Date(event.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
//                     eventTime: event.time,
//                     giftReference: paymentReference,
//                     giftedBy: user.firstName,
//                     year: new Date().getFullYear(),
//                     paymentDate: new Date(),
//                     amount: `${currency} ${amount}`
//                 }
//             );
//         } else {
//             streams = await Streampass.create([{
//                 user: userId,
//                 event: eventId,
//                 paymentMethod,
//                 paymentReference,
//                 email: user.email,
//                 firstName: user.firstName,
//                 isGift: false
//             }], { session });

//             await emailService.sendEmail(
//                 user.email,
//                 'Event Streampass',
//                 'eventStreamPass',
//                 {
//                     eventName: event.name,
//                     eventDate: new Date(event.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
//                     eventTime: event.time,
//                     userName: user.firstName,
//                     paymentReference,
//                     paymentDate: new Date(),
//                     amount: `${currency} ${amount}`,
//                     year: new Date().getFullYear()
//                 }
//             );
//             streams = streams[0];
//         }

//         await Transactions.create([{
//                 user: userId,
//                 event: eventId,
//                 isGift: isGift,
//                 paymentMethod,
//                 paymentReference,
//                 amount: amount,
//                 currency: currency,
//                 status: TransactionStatus.SUCCESSFUL
//                 }], { session })

//         await session.commitTransaction();
//         session.endSession();

//         res.status(201).json({ message: 'Streampass purchased successfully', streampass: streams });
//     } catch (error) {
//         await session.abortTransaction();
//         await Transactions.create([{
//                 user: userId,
//                 event: eventId,
//                 isGift: isGift,
//                 paymentMethod,
//                 paymentReference,
//                 amount: amount,
//                 currency: currency,
//                 status: TransactionStatus.SUCCESSFUL
//                 }], { session })
//         session.endSession();
//         console.error(error);
//         res.status(500).json({ message: 'Something went wrong. Please try again later' });
//     }
// }

async buyStreampass(req: Request, res: Response) {
  const { paymentMethod, paymentReference } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();

  // Declare these so they're accessible in both try and catch
  let isGift: boolean = false;
  let userId: string | undefined;
  let eventId: string | undefined;
  let amount: number | undefined;
  let currency: string | undefined;

  try {
    let paymentVerified;
    if (paymentMethod === 'flutterwave') {
      paymentVerified = await verifyFlutterwavePayment(paymentReference);
    } else if (paymentMethod === 'stripe') {
      paymentVerified = await verifyStripePayment(paymentReference);
    } else {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    if (!paymentVerified) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const { success, eventId: evtId, userId: uid, amount: amt, friends, currency: cur } = paymentVerified;
    if (!success) return res.status(400).json({ message: 'Payment not verified' });

    // Assign for later use
    userId = uid;
    eventId = evtId;
    amount = amt;
    currency = cur;

    const existing = await Streampass.findOne({ paymentMethod, paymentReference, event: eventId, user: userId });
    if (existing) {
      return res.status(201).json({ message: 'Streampass purchased successfully', streampass: existing });
    }

    const event = await Event.findById(eventId).session(session);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const priceObj = event.prices.find((p: any) => p.currency === currency);
    const expectedAmount = paymentMethod === 'stripe' ? Math.round(Number(priceObj?.amount) * 100) : priceObj?.amount;
    if (amount != expectedAmount) return res.status(400).json({ message: 'Payment Not verified. Please contact customer care.' });

    const user = await getOneUser(userId as string, res);
    if (!user || !user.email) {
      return res.status(404).json({ message: 'User not found or email missing' });
    }

    let streams;

    if (friends && friends.length > 0) {
      const emails = friends.map((f: { email: string }) => f.email.toLowerCase());
      const users = await User.find({ email: { $in: emails } }).select('_id email').session(session);
      const userMap = new Map(users.map(u => [u.email.toLowerCase(), u._id]));
      const streampasses = [];
      const gifts = [];
      isGift = true;

      for (const friend of friends) {
        const friendUserId = userMap.get(friend.email.toLowerCase());

        streampasses.push({
          event: eventId,
          paymentMethod,
          paymentReference,
          firstName: friend.firstName,
          email: friend.email,
          isGift: true,
          ...(friendUserId ? { user: friendUserId, hasConverted: true } : {})
        });

        gifts.push({
          sender: user.id,
          receiversEmail: friend.email,
          receiverFirstName: friend.firstName,
          hasUsed: false,
          paymentMethod,
          paymentReference,
          event: eventId,
          ...(friendUserId ? { user: friendUserId, hasConverted: true } : {})
        });
      }

      await Streampass.insertMany(streampasses, { session });
      await Gift.insertMany(gifts, { session });

      streams = { event: eventId, user: userId };

      await Promise.all(
        streampasses.map(pass => {
          return emailService.sendEmail(
            pass.email,
            'You received a gift Streampass!',
            'giftStreamPass',
            {
              receiverName: pass.firstName,
              eventName: event.name,
              eventDate: new Date(event.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
              eventTime: event.time,
              giverName: user.firstName,
              accessUrl: `${process.env.FRONTEND_URL}`,
              year: new Date().getFullYear()
            }
          );
        })
      );

      await emailService.sendEmail(
        user.email,
        'You purchased a gift Streampass!',
        'giftSenderReceipt',
        {
          giverName: user.firstName,
          eventName: event.name,
          eventDate: new Date(event.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          eventTime: event.time,
          giftReference: paymentReference,
          giftedBy: user.firstName,
          year: new Date().getFullYear(),
          paymentDate: new Date(),
          amount: `${currency} ${amount}`
        }
      );
    } else {
      streams = await Streampass.create([{
        user: userId,
        event: eventId,
        paymentMethod,
        paymentReference,
        email: user.email,
        firstName: user.firstName,
        isGift: false
      }], { session });

      await emailService.sendEmail(
        user.email,
        'Event Streampass',
        'eventStreamPass',
        {
          eventName: event.name,
          eventDate: new Date(event.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          eventTime: event.time,
          userName: user.firstName,
          paymentReference,
          paymentDate: new Date(),
          amount: `${currency} ${amount}`,
          year: new Date().getFullYear()
        }
      );
      streams = streams[0];
    }

    await Transactions.create([{
      user: userId,
      event: eventId,
      isGift,
      paymentMethod,
      paymentReference,
      amount,
      currency,
      status: TransactionStatus.SUCCESSFUL
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: 'Streampass purchased successfully', streampass: streams });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    try {
      if (userId && eventId && amount && currency) {
        await Transactions.create([{
          user: userId,
          event: eventId,
          isGift,
          paymentMethod,
          paymentReference,
          amount,
          currency,
          status: TransactionStatus.FAILED
        }]);
      }
    } catch (txError) {
      console.error('Failed to log failed transaction:', txError);
    }

    console.error(error);
    res.status(500).json({ message: 'Something went wrong. Please try again later' });
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
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
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
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
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
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

        async createStripeCheckoutSession(req: Request, res: Response) {
        try {
            const { eventId, currency, friends } = req.body;
            const event = await Event.findById(eventId) as (typeof Event.prototype & { _id: mongoose.Types.ObjectId });
            const priceObj = event.prices.find((p: any) => p.currency === currency);
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }
            const user = {id: req.user.id, email: req.user.email}
            const verifyStreamPass = await Streampass.findOne({event:eventId, user:req.user.id})
            if(verifyStreamPass && (!friends || friends.length == 0)) {
                return res.status(404).json({ message: 'You already have a streampass for this event' });
            }
            const session = await createStripeCheckoutSession(currency, event, user, friends, priceObj)
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
            const priceObj = event.prices.find((p: any) => p.currency === currency);
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }
            const user = {id: req.user.id, email: req.user.email, name: req.user.name}
            const verifyStreamPass = await Streampass.findOne({event:eventId, user:req.user.id})
            if(verifyStreamPass && (!friends || friends.length == 0)) {
                return res.status(404).json({ message: 'You already have a streampass for this event' });
            }
             const response = await flutterwaveInitialization(event, currency, user, friends, priceObj)
                res.status(200).json({ link: response.data.data.link });
            } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Flutterwave Initialisation and  creation failed' });
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
        res.status(500).json({ message: 'Something went wrong. Please try again later' });
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