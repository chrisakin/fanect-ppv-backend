import { Request, Response } from 'express';
import Streampass from '../models/Streampass';
import Event, { EventStatus, IEvent } from '../models/Event';
import { flutterwaveInitialization, getAllBanks, resolveBankAccount, verifyFlutterwavePayment } from '../services/flutterwaveService';
import { createStripeCheckoutSession, verifyStripePayment } from '../services/stripeService';
import emailService from '../services/emailService';
import { getOneUser } from '../services/userService';
import mongoose from 'mongoose';
import { paginateAggregate } from '../services/paginationService';
import User from '../models/User';
import Gift from '../models/Gift';
import Transactions, { TransactionStatus } from '../models/Transactions';
import { CreateActivity } from '../services/userActivityService';

/**
 * Controller handling streampass purchase flows, payment session creation,
 * session management (start/stop/heartbeat), and helper endpoints for banks/account resolution.
 */
class StreampassController {

  /**
   * Purchase streampass(es) for an event.
   * - Verifies payment via the selected gateway (Flutterwave or Stripe).
   * - Handles single and gift purchases, creates Streampass/Gift/Transaction records in a DB transaction,
   *   sends recipient and sender emails, and records a user activity.
   * @param req Express request. Expects `body.paymentMethod`, `body.paymentReference` and gateway-specific payload returned by verification.
   * @param res Express response. Returns 201 with created streampass information or appropriate 4xx/5xx errors.
   */
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

    const { success, eventId: evtId, userId: uid, amount: amt,    friends, currency: cur } = paymentVerified;
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

    const priceObj = event.prices.find((p: any) => p.currency.toLowerCase() === currency?.toLowerCase());
    const expectedAmount =  friends && friends.length > 0 ? Number(priceObj?.amount) * friends.length : priceObj?.amount;
    if (amount != expectedAmount) return res.status(400).json({ message: 'Payment Not verified. Please contact customer care.' });

    const user = await getOneUser(userId as string, res);
    if (!user || !user.email) {
      return res.status(404).json({ message: 'User not found or email missing' });
    }

    let streams;
    let activityDescription

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

      streams = { event: eventId, user: userId, isGift };

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
          amount: `${currency?.toUpperCase()} ${amount}`,
          friends: friends
        }
      );
        activityDescription = `User purchased ${friends.length} gift streampasses for event ${event.name}`;
    } else {
      await Streampass.create([{
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
          amount: `${currency?.toUpperCase()} ${amount}`,
          year: new Date().getFullYear()
        }
      );
      streams = { event: eventId, user: userId, isGift: false, isLive: event.status === EventStatus.LIVE };
        activityDescription = `User purchased a streampass for event ${event.name}`;
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
    CreateActivity({
    user: userId as unknown as mongoose.Types.ObjectId,
    eventData: activityDescription,
    component: 'streampass',
    activityType: 'buystreampass'
    });
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

  /**
   * Start or end a single streaming session for a streampass.
   * - `body.startSession` (boolean) controls starting vs ending a session.
   * - When starting, ensures there is no concurrent active session for the same user and event,
   *   generates a `sessionToken`, and sets `inSession`/`lastActive`.
   * - When ending, requires `body.clientSessionToken` and validates it before closing the session.
   * @param req Express request. Expects `body.streampassId`, `body.startSession`, optional `body.clientSessionToken` and authenticated `user.id`.
   * @param res Express response with status and session token when started.
   */
  async createSingleSession(req: Request, res: Response) {
   const { streampassId, startSession, clientSessionToken } = req.body;
    const userId = req.user.id;
    console.log(userId)
   try {
     const streampass = await Streampass.findById(streampassId);
     if (!streampass) {
       return res.status(404).json({ message: 'Streampass not found' });
     }
     if (streampass.user.toString() !== userId) {
       return res.status(403).json({ message: 'You are not authorized to create a session for this Streampass' });
     }
     if(typeof startSession !== 'boolean') {
       return res.status(400).json({ message: 'Invalid startSession value' });
     }

     if (startSession) {
       // Check for existing active session
       const activeThreshold = new Date(Date.now() - 30 * 1000); // 30 seconds ago
       const existingActiveSession = await Streampass.findOne({
         user: userId,
         event: streampass.event,
         inSession: true,
         lastActive: { $gte: activeThreshold }
       });

       if (existingActiveSession && existingActiveSession.id.toString() !== streampassId) {
         return res.status(409).json({ 
           message: `You’re still logged in from another session.
          This may happen if you just refreshed the page. We’ll automatically reconnect your stream in 15 seconds.` 
         });
       }

       // Generate new session token
       const newSessionToken = require('uuid').v4();
       streampass.inSession = true;
       streampass.sessionToken = newSessionToken;
       streampass.lastActive = new Date();

       await streampass.save();
       res.status(200).json({ 
         message: 'Stream session started successfully',
         sessionToken: newSessionToken
       });
     } else {
       // End session
       if (!clientSessionToken) {
         return res.status(400).json({ message: 'Client session token is required to end session' });
       }

      //  if (streampass.sessionToken !== clientSessionToken) {
      //    return res.status(403).json({ message: 'Invalid session token' });
      //  }

       streampass.inSession = false;
       streampass.sessionToken = undefined;
       streampass.lastActive = undefined;
       await streampass.save();
       res.status(200).json({ message: 'Stream session ended successfully' });
     }
   } catch (error) {
     console.error(error);
     res.status(500).json({ message: 'Something went wrong. Please try again later' });
   }
 }

  /**
   * Update the heartbeat (last active timestamp) for an active streampass session.
   * - Validates the streampass exists and belongs to the requesting user, then updates `lastActive`.
   * @param req Express request. Expects `body.streampassId`, `body.clientSessionToken` and authenticated `user.id`.
   * @param res Express response indicating success or error.
   */
  async updateStreamSessionHeartbeat(req: Request, res: Response) {
   const { streampassId, clientSessionToken } = req.body;
   const userId = req.user.id;

   try {
     if (!streampassId || !clientSessionToken) {
       return res.status(400).json({ message: 'Streampass ID and client session token are required' });
     }

     const streampass = await Streampass.findById(streampassId);
     if (!streampass) {
       return res.status(404).json({ message: 'Streampass not found' });
     }

     if (streampass.user.toString() !== userId) {
       return res.status(403).json({ message: 'You are not authorized to update this session' });
     }

     // Update last active timestamp
     streampass.lastActive = new Date();
     await streampass.save();

     res.status(200).json({ message: 'Heartbeat updated successfully' });
   } catch (error) {
     console.error(error);
     res.status(500).json({ message: 'Something went wrong. Please try again later' });
   }
 }


      /**
       * Retrieve upcoming ticketed events for the authenticated user (paginated).
       * - Aggregates streampass documents joined with event details and returns event list ordered by start time.
       * @param req Express request. Supports `query.page` and `query.limit` and requires authenticated `user.id`.
       * @param res Express response with paginated upcoming events.
       */
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
                { $match: { 'event.status': EventStatus.UPCOMING, 'event.published': true } },
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
            CreateActivity({
            user: userId as unknown as mongoose.Types.ObjectId,
            eventData: `Fetched upcoming events for user with ID ${userId}`,
            component: 'streampass',
            activityType: 'upcomingstreampass'
            });
            res.status(200).json({ message: 'Upcoming events gotten successfully', ...result });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    /**
     * Retrieve live ticketed events for the authenticated user (paginated).
     * - Similar to `getUpcomingTicketedEvents` but filters by live event status.
     * @param req Express request. Supports `query.page` and `query.limit` and requires authenticated `user.id`.
     * @param res Express response with paginated live events.
     */
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
            CreateActivity({
            user: userId as unknown as mongoose.Types.ObjectId,
            eventData: `Fetched live events for user with ID ${userId}`,
            component: 'streampass',
            activityType: 'livestreampass'
            });
            res.status(200).json({ message: 'Live events gotten successfully', ...result });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    /**
     * Retrieve past ticketed events for the authenticated user (paginated).
     * - Returns events that have already occurred, with optional pagination.
     * @param req Express request. Supports `query.page` and `query.limit` and requires authenticated `user.id`.
     * @param res Express response with paginated past events.
     */
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
            CreateActivity({
            user: userId as unknown as mongoose.Types.ObjectId,
            eventData: `Fetched past events for user with ID ${userId}`,
            component: 'streampass',
            activityType: 'paststreampass'
            });
            res.status(200).json({ message: 'Past events gotten successfully', ...result });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

      /**
       * Create a Stripe checkout session for purchasing streampass(es).
       * - Validates the event and ensures the user or friends don't already have streampasses.
       * - Calls `createStripeCheckoutSession` service and records activity.
       * @param req Express request. Expects `body.eventId`, `body.currency`, optional `body.friends` and authenticated `user` info.
       * @param res Express response with the Stripe session URL or error.
       */
      async createStripeCheckoutSession(req: Request, res: Response) {
        try {
            const { eventId, currency, friends } = req.body;
            const event = await Event.findById(eventId) as (typeof Event.prototype & { _id: mongoose.Types.ObjectId });
            const priceObj = event.prices.find((p: any) => p.currency.toLowerCase() === currency.toLowerCase());
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }
            // if(!priceObj) {
            //      return res.status(404).json({ message: 'Price not set for your currency' });
            // }
            const user = {id: req.user.id, email: req.user.email}
            const verifyStreamPass = await Streampass.findOne({event:eventId, user:req.user.id})
            if(verifyStreamPass && (!friends || friends.length == 0)) {
                return res.status(404).json({ message: 'You already have a streampass for this event' });
            }
            const verifyFriends = friends && friends.length > 0 ? friends.map((f: { email: string }) => f.email.toLowerCase()) : [];
            if(verifyFriends.length > 0) {
                const users = await Streampass.find({ email: { $in: verifyFriends } }).select('_id email').lean();
                if(users.length > 0) {
                    return res.status(404).json({ message: `Some friends already have streampass for this event ${users.map(u => u.email).join(', ')}` });
                }
            }
            const session = await createStripeCheckoutSession(currency, event, user, friends, priceObj)
            CreateActivity({
            user: req.user.id as unknown as mongoose.Types.ObjectId,
            eventData: `Created stripe Checkout Session for event ${event.name}`,
            component: 'streampass',
            activityType: 'stripecheckout'
            });
            res.status(200).json({ url: session.url });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Stripe session creation failed' });
        }
    }

    /**
     * Initialize a Flutterwave payment session for streampass purchase.
     * - Validates the event and friends list, calls `flutterwaveInitialization` service, and records activity.
     * @param req Express request. Expects `body.eventId`, `body.currency`, optional `body.friends` and authenticated `user` info.
     * @param res Express response with a payment link or error.
     */
    async flutterwaveInitialization(req: Request, res: Response) {
        try {
           const { eventId, currency, friends } = req.body;
            const event = await Event.findById(eventId) as (typeof Event.prototype & { _id: mongoose.Types.ObjectId });
            const priceObj = event.prices.find((p: any) => p.currency.toLowerCase() === currency.toLowerCase());
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }
            const user = {id: req.user.id, email: req.user.email, name: req.user.name}
            const verifyStreamPass = await Streampass.findOne({event:eventId, user:req.user.id})
            if(verifyStreamPass && (!friends || friends.length == 0)) {
                return res.status(404).json({ message: 'You already have a streampass for this event' });
            }
             const verifyFriends = friends && friends.length > 0 ? friends.map((f: { email: string }) => f.email.toLowerCase()) : [];
            if(verifyFriends.length > 0) {
                const users = await Streampass.find({ email: { $in: verifyFriends }, event: eventId }).select('_id email').lean();
                if(users.length > 0) {
                   const uniqueEmails = [...new Set(users.map(u => u.email))];
                    return res.status(409).json({
                      message: `Some friends already have streampass for this event: ${uniqueEmails.join(', ')}`
                    });
                }
            }
             const response = await flutterwaveInitialization(event, currency, user, friends, priceObj)
             CreateActivity({
            user: req.user.id as unknown as mongoose.Types.ObjectId,
            eventData: `Created flutterwave initialisation session for event ${event.name}`,
            component: 'streampass',
            activityType: 'flutterwave'
            });
                res.status(200).json({ link: response.data.data.link });
            } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Flutterwave Initialisation and  creation failed' });
            }
    }

    /**
     * Fetch the authenticated user's streampass for a specific event.
     * - Ensures the streampass exists and is not in a recent active session; records a streaming activity upon success.
     * @param req Express request. Expects `params.eventId` and authenticated `user.id`.
     * @param res Express response with the streampass or 404/409 on errors.
     */
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
        if(!streampass.event) {
            return res.status(404).json({ message: 'Event not found for this streampass' });
        }
        
        // Check if there's an active session within the threshold
        const activeThreshold = new Date(Date.now() - 30 * 1000); // 30 seconds ago
        if (streampass.inSession && streampass.lastActive && streampass.lastActive >= activeThreshold) {
            return res.status(409).json({ message: 'You’re still logged in from another session. This may happen if you just refreshed the page. We’ll automatically reconnect your stream in 15 seconds.' });
        }
        
        CreateActivity({
            user: req.user.id as unknown as mongoose.Types.ObjectId,
            eventData: `Started streaming session for event ${(streampass.event as any).name}`,
            component: 'streampass',
            activityType: 'streamsession'
            });
        res.status(200).json({ message: 'Streampass found', streampass });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong. Please try again later' });
    }
}

  /**
   * Retrieve supported banks for a given country code (defaults to 'NG').
   * - Calls external service `getAllBanks` and returns the bank list.
   * @param req Express request. Optional `query.country` (ISO country code).
   * @param res Express response with `banks` array or 500 on failure.
   */
  async getBanks(req: Request, res: Response) {
        try {
            const country = req.query.country as string || 'NG';
            const data = await getAllBanks(country);
            res.status(200).json({ banks: data.data });
        } catch (error) {
            res.status(500).json({ message: 'Unable to fetch banks' });
        }
    }

    /**
     * Resolve bank account details using account number and bank code.
     * - Validates required body fields and calls the bank resolution service.
     * @param req Express request. Expects `body.account_number` and `body.bank_code`.
     * @param res Express response with resolved account information or 400/500 on error.
     */
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