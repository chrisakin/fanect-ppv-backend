import { Request, Response } from 'express';
import Event, { AdminStatus, EventStatus } from '../../models/Event';
import { createChannel, createChatRoom, getStreamKeyValue, getSavedBroadCastUrl } from '../../services/ivsService';
import Streampass from '../../models/Streampass';
import { IUser } from '../../models/User';
import { sendNotificationToUsers } from '../../services/fcmService';
import EmailService from '../../services/emailService';
import { broadcastEventStatus } from '../../services/sseService';
import mongoose, { Types } from 'mongoose';
import { paginateAggregate } from '../../services/paginationService';
import s3Service from '../../services/s3Service';
import { getEventAnalytics } from '../../services/analyticsService';
import { CreateAdminActivity } from '../../services/userActivityService';
import Transactions, { TransactionStatus } from '../../models/Transactions';
import EventLocation from '../../models/EventLocation';

class EventController {
    constructor() {
        this.updateEventSession = this.updateEventSession.bind(this)
        this.notifyEventStatus = this.notifyEventStatus.bind(this)
    }
  async publishEvent(req: Request, res: Response) {
        const { id } = req.params;

        try {
            const event = await Event.findById(id).populate('createdBy', 'username email firstName lastName');
            if (!event || event.isDeleted) {
                return res.status(404).json({ message: 'Event not found' });
            }
            if(event.published) {
                return res.status(404).json({ message: 'Event is already published' });
            }

            const channel = await createChannel(event.name);
            if (!channel || !channel.arn) {
               return res.status(500).json({ message: 'Failed to create event' });
            }
            const streamKey = await getStreamKeyValue(channel.arn);
            const chat = await createChatRoom(event.name);
            if(!chat || !chat.arn) {
               return res.status(500).json({ message: 'Failed to create event' });
            }

            event.published = true;
            event.adminStatus = AdminStatus.APPROVED
            event.publishedBy = req.admin.id
            event.ivsChannelArn = channel && channel.arn,
            event.ivsPlaybackUrl = channel && channel.playbackUrl ? channel.playbackUrl : undefined, 
            event.ivsChatRoomArn = chat.arn,
            event.ivsIngestEndpoint = channel && channel.ingestEndpoint ? channel.ingestEndpoint : undefined
            event.ivsIngestStreamKey = channel && streamKey ? streamKey : undefined
            await event.save();
            CreateAdminActivity({
            admin: req.admin.id as mongoose.Types.ObjectId,
            eventData: `Admin published and approved event with id ${id}`,
            component: 'event',
            activityType: 'publishevent'
            });
            await EmailService.sendEmail(
                (event.createdBy as unknown as IUser).email,
                'Event Approved and Published',
                'eventStatus',
                { userName: (event.createdBy as unknown as IUser).firstName, eventName: event.name, status: "Approved", statusClass: "status-approved", isApproved: true, year: new Date().getFullYear() }
            );

            res.status(200).json({ message: 'Event published successfully', event });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async getEventLocations(req: Request, res: Response) {
      const { id } = req.params;
      try {
        const event = await Event.findById(id).lean();
         if (!event || event.isDeleted) {
                return res.status(404).json({ message: 'Event not found' });
            }
        const locations = await EventLocation.find({event: id}).lean()
        res.status(200).json({ message: 'Event locations gotten successfully', locations });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

      async updateEventLocations(req: Request, res: Response) {
        const { id } = req.params;
        try {
            const event = await Event.findById(id);
            if (!event || event.isDeleted) {
                return res.status(404).json({ message: 'Event not found' });
            }
            if(event.published) {
                return res.status(404).json({ message: 'Event is already published' });
            }
            const locations = req.body.locations
            await EventLocation.insertMany(locations)
            CreateAdminActivity({
            admin: req.admin.id as mongoose.Types.ObjectId,
            eventData: `Admin updated event locations for event with id ${id}`,
            component: 'event',
            activityType: 'publishevent'
            });

            res.status(200).json({ message: 'Event updated successfully', event });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async unpublishEvent(req: Request, res: Response) {
        const { id } = req.params;

        try {
            const event = await Event.findById(id);
            if (!event || event.isDeleted) {
                return res.status(404).json({ message: 'Event not found' });
            }

            event.published = false;
            event.unpublishedBy = req.admin.id
            await event.save();
            CreateAdminActivity({
            admin: req.admin.id as mongoose.Types.ObjectId,
            eventData: `Admin unpublished event with id ${id}`,
            component: 'event',
            activityType: 'unpublishevent'
            });
            res.status(200).json({ message: 'Event unpublished successfully', event });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

       async rejectEvent(req: Request, res: Response) {
        const { id } = req.params;
        const { rejectionReason } = req.body
        try {
            const event = await Event.findById(id).populate('createdBy', 'username email firstName lastName');
            if (!event || event.isDeleted) {
                return res.status(404).json({ message: 'Event not found' });
            }

            event.published = false;
            event.adminStatus = AdminStatus.REJECTED
            event.rejectionReason = rejectionReason
            event.rejectedBy = req.admin.id
            event.unpublishedBy = req.admin.id
            await event.save();
            CreateAdminActivity({
            admin: req.admin.id as mongoose.Types.ObjectId,
            eventData: `Admin rejected event with id ${id}`,
            component: 'event',
            activityType: 'rejectevent'
            });
            await EmailService.sendEmail(
                (event.createdBy as unknown as IUser).email,
                'Event Rejected',
                'eventStatus', // your email template
                { userName: (event.createdBy as unknown as IUser).firstName, eventName: event.name, status: "Rejected", statusClass: "status-rejected", isApproved: false, rejectedReason: rejectionReason, year: new Date().getFullYear() }
            );

            res.status(200).json({ message: 'Event unpublished successfully', event });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async updateEventSession(req: Request, res: Response) {
   const { id } = req.params;
   const { session } = req.body

        try {
            const event = await Event.findById(id);
            if (!event || event.isDeleted) {
                return res.status(404).json({ message: 'Event not found' });
            }
            if(!event.published) {
                return res.status(404).json({ message: 'Event has not been approved ' });
            }

            if(!session) {
                return res.status(404).json({message: 'Session is reuired'})
            }
               if (session === 'stream-start') {
                    event.status = EventStatus.LIVE;
                    event.startedEventBy = req.admin.id
                    await event.save();
                    broadcastEventStatus(id, {message: 'Event has started', status: EventStatus.LIVE});
                     await this.notifyEventStatus(event, EventStatus.LIVE);
                     CreateAdminActivity({
                      admin: req.admin.id as mongoose.Types.ObjectId,
                      eventData: `Admin started streaming event with id ${id}`,
                      component: 'event',
                      activityType: 'startstreamevent'
                    });
                } else if (session === 'stream-end') {
                    const url = await getSavedBroadCastUrl(event.ivsChannelArn)
                    // if(!url) {
                    //     return res.status(404).json({ message: 'Broadcast url has not been saved or the broadcast has not ended. Retry again after 10 mins.' });
                    // }
                    event.status = EventStatus.PAST;
                    event.endedEventBy = req.admin.id
                    //event.ivsSavedBroadcastUrl = url
                    await event.save();
                    broadcastEventStatus(id, {message: 'Event has ended', status: EventStatus.PAST});
                    await this.notifyEventStatus(event, EventStatus.PAST);
                    CreateAdminActivity({
                      admin: req.admin.id as mongoose.Types.ObjectId,
                      eventData: `Admin ended streaming event with id ${id}`,
                      component: 'event',
                      activityType: 'endstreamevent'
                    });
                }
            res.status(200).json({ message: 'Event session updated successfully', event });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
}

async getAllEvents(req: Request, res: Response) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search as string | undefined;
    const filter: any = {};

    if (req.query.status) {
      filter.status = req.query.status as EventStatus;
    }

    if (req.query.adminStatus) {
      filter.adminStatus = req.query.adminStatus as AdminStatus;
    }

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;

    const pipeline: any[] = [
      {
        $addFields: {
          eventDateTime: {
            $dateFromString: {
              dateString: {
                $concat: [
                  { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                  'T',
                  {
                    $cond: [
                      { $eq: [{ $type: '$time' }, 'string'] },
                      '$time',
                      { $dateToString: { format: '%H:%M', date: '$time' } },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    ];

    // Base filters
    pipeline.push({ $match: filter });

    // Add date range filter
    if (startDate || endDate) {
      const dateMatch: any = {};
      if (startDate) {
        dateMatch.$gte = startDate;
      }
      if (endDate) {
        dateMatch.$lte = endDate;
      }

      pipeline.push({
        $match: {
          eventDateTime: dateMatch,
        },
      });
    }

    // Search filter
    if (search?.trim()) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { broadcastSoftware: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    // Sorting
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrderStr = (req.query.sortOrder as string) || 'desc';
    const sortOrder = sortOrderStr.toLowerCase() === 'desc' ? -1 : 1;

    pipeline.push({ $sort: { [sortBy]: sortOrder } });

    const result = await paginateAggregate(Event, pipeline, { page, limit });
    CreateAdminActivity({
     admin: req.admin.id as mongoose.Types.ObjectId,
     eventData: `Admin got all events`,
     component: 'event',
     activityType: 'allevent'
     });
    res.status(200).json({
      message: 'Events gotten successfully',
      ...result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong. Please try again later' });
  }
}

async getEventById(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid event ID' });
  }
  
  try {
    const results = await Event.findById(id).populate('createdBy', 'username email firstName lastName').populate('publishedBy', 'email firstName lastName');

    if (!results) {
      return res.status(404).json({ message: 'Event not found' });
    }
    CreateAdminActivity({
     admin: req.admin.id as mongoose.Types.ObjectId,
     eventData: `Admin got event with id ${id}`,
     component: 'event',
     activityType: 'singleevent'
     });
    return res.status(200).json({
      message: 'Event fetched successfully',
      results
    });

  } catch (error) {
    console.error('Get event by ID error:', error);
    return res.status(500).json({
      message: 'Something went wrong. Please try again later',
    });
  }
}

async getSingleEventTransactions(req: Request, res: Response) {
          try {
            const id = req.params.id
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const search = req.query.search as string | undefined;
            const filter: any = {};
            const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
            const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
    
        
            if (req.query.status) {
              filter.status = req.query.status as TransactionStatus;
            }
            if(req.query.giftStatus) {
              filter.isGift = req.query.giftStatus == 'gift' ? true : false;
            }
            if(req.query.paymentMethod) {
              filter.paymentMethod = req.query.paymentMethod as 'flutterwave' | 'stripe';
            } 
           if (req.query.currency) {
            const currencies = Array.isArray(req.query.currency)
             ? req.query.currency
             : (req.query.currency as string).split(',').map(c => c.trim().toLowerCase());

            filter.currency = { $in: currencies };
            }
    
          const dateMatch: any = {};
          if (startDate) dateMatch.$gte = startDate;
          if (endDate) dateMatch.$lte = endDate;
    
    
            const pipeline: any[] = [
      { 
        $match: {event: new mongoose.Types.ObjectId(id),  ...filter } 
      },
      { 
        $lookup: { 
          from: 'events', 
          localField: 'event', 
          foreignField: '_id', 
          as: 'eventDetails' 
        } 
      },
      { 
        $unwind: '$eventDetails' 
      },
      { 
        $lookup: { 
          from: 'users', 
          localField: 'user', 
          foreignField: '_id', 
          as: 'userDetails' 
        } 
      },
      { 
        $unwind: '$userDetails' 
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$$ROOT',
              {
                eventName: '$eventDetails.name',
                eventDate: '$eventDetails.date',
                eventTime: '$eventDetails.time',
                eventStatus: '$eventDetails.status',
                eventAdminStatus: '$eventDetails.adminStatus',
                eventId: '$eventDetails._id',
                firstName: '$userDetails.firstName',
                lastName: '$userDetails.lastName',
              }
            ]
          }
        }
      },
      {
        $project: {
          eventDetails: 0,
          userDetails: 0,
          user: 0,
          event: 0
        }
      }
    ];
    
    
        if (startDate || endDate) {
          pipeline.push({
            $match: {
              createdAt: dateMatch
            }
          });
        }
        
            if (search?.trim()) {
              pipeline.push({
                $match: {
                  $or: [
                    { eventName: { $regex: search, $options: 'i' } },
                    { paymentReference: { $regex: search, $options: 'i' } },
                    { currency: { $regex: search, $options: 'i' } },
                    { amount: { $regex: search, $options: 'i' } },
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                  ],
                },
              });
            }
        
            // Sorting
            const sortBy = (req.query.sortBy as string) || 'createdAt';
            const sortOrderStr = (req.query.sortOrder as string) || 'desc';
            const sortOrder = sortOrderStr.toLowerCase() === 'desc' ? 1 : -1;
        
            pipeline.push({ $sort: { [sortBy]: sortOrder } });
        
            const result = await paginateAggregate(Transactions, pipeline, { page, limit });
            CreateAdminActivity({
          admin: req.admin.id as mongoose.Types.ObjectId,
          eventData: `Admin got transactions for event with id ${id}`,
          component: 'users',
          activityType: 'usertransactions'
          })
            res.status(200).json({
              message: 'Event ransaction history fetched successfully',
              ...result,
            });
          } catch (error) {
            console.error('Error fetching event transaction history:', error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
          }
        }

async getSingleEventMetrics(req: Request, res: Response) {
   const { id } = req.params;
    const { month: selectedMonth, currency: selectedCurrency } = req.query;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid event ID' });
  }
    const pipeline: any = await getEventAnalytics(id, selectedMonth as string, selectedCurrency as string);
    const result = await Event.aggregate(pipeline);
      if (result.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    CreateAdminActivity({
     admin: req.admin.id as mongoose.Types.ObjectId,
     eventData: `Admin got metrics for event with id ${id}`,
     component: 'event',
     activityType: 'eventmetrics'
     });
    
    res.json(result[0]);  
  
  } catch (error) {
    console.error('Get event by ID error:', error);
    return res.status(500).json({
      message: 'Something went wrong. Please try again later',
    });
  }
}

async createEvent(req: Request, res: Response) {
        const { name, date, time, description, prices, haveBroadcastRoom, broadcastSoftware, scheduledTestDate } = req.body;
        const userId = req.admin.id;
        let price
        if(!prices ) {
           return res.status(400).json({ message: 'At least one price is required' });
        }
        if (typeof prices === 'string') {
        price = JSON.parse(prices);
        } else {
        price = prices
        }
        try {
             const eventDateTime = new Date(`${date}T${time}`);
            if (isNaN(eventDateTime.getTime()) || eventDateTime <= new Date()) {
                return res.status(400).json({ message: 'Event date and time must be in the future' });
            }
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            const banner = files?.banner?.[0];
            const watermark = files?.watermark?.[0];
            const trailer = files?.trailer?.[0];

            if (!banner) {
                return res.status(400).json({ message: 'Banner and watermark images are required' });
            }
            let bannerUrl
            let watermarkUrl
            let trailerUrl
           if(banner) {
             bannerUrl = await s3Service.uploadFile(banner, 'event-banners');
           }
           if(watermark) {
             watermarkUrl = await s3Service.uploadFile(watermark, 'event-watermarks');
           }
            if(trailer) {
                trailerUrl = await s3Service.uploadFile(trailer, 'event-trailers')
            }
           
            const event = new Event({
                name: name.trim(),
                date,
                time,
                description,
                bannerUrl,
                watermarkUrl,
                trailerUrl,
                prices: price,
                haveBroadcastRoom,
                broadcastSoftware,
                scheduledTestDate,
                createdBy: userId,
                createdByModel: 'Admin'
            });

            await event.save();
            CreateAdminActivity({
            admin: req.admin.id as mongoose.Types.ObjectId,
            eventData: `Admin created event ${name}`,
            component: 'event',
            activityType: 'createevent'
            });
            res.status(201).json({ message: 'Event created successfully', event });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

     async updateEvent(req: Request, res: Response) {
            const { id } = req.params;
            const { name, date, time, description, prices, haveBroadcastRoom, broadcastSoftware, scheduledTestDate } = req.body;
            const userId = req.admin.id;
            try {
                 let price
            // if(!prices ) {
            //    return res.status(400).json({ message: 'At least one price is required' });
            // }
           if(prices) {
             if (typeof prices === 'string') {
            price = JSON.parse(prices);
            } else {
            price = prices
            }
           }
                const event = await Event.findById(id);
                if (!event || event.isDeleted) {
                    return res.status(404).json({ message: 'Event not found' });
                }
    
                if (event.createdBy.toString() !== req.admin.id) {
                    return res.status(403).json({ message: 'Unauthorized' });
                }
    
                // Only check if date or time is being updated
                if(date || time) {
                const newDate = date || event.date;
                const newTime = time || event.time;
                const eventDateTime = new Date(`${newDate}T${newTime}`);
                if (isNaN(eventDateTime.getTime()) || eventDateTime <= new Date()) {
                    return res.status(400).json({ message: 'Event date and time must be in the future' });
                  }
                }
                let bannerKey
                const files = req.files as { [fieldname: string]: Express.Multer.File[] };
                if (files?.banner) {
                     bannerKey =  await s3Service.getS3KeyFromUrl(event.bannerUrl)
                    event.bannerUrl = await s3Service.uploadFile(files.banner?.[0], 'event-banners');
                }
                let watermarkKey
                if (files?.watermark) {
                    watermarkKey = await s3Service.getS3KeyFromUrl(event.watermarkUrl)
                    event.watermarkUrl = await s3Service.uploadFile(files.watermark?.[0], 'event-watermarks');
                }
                 let trailerKey
                if (files?.trailer) {
                    trailerKey = await s3Service.getS3KeyFromUrl(event.trailerUrl)
                    event.trailerUrl = await s3Service.uploadFile(files.trailerUrl?.[0], 'event-trailers');
                }
    
                event.name = name || event.name;
                event.date = date || event.date;
                event.time = time || event.time;
                event.description = description || event.description;
                event.prices = price || event.prices
                event.haveBroadcastRoom = haveBroadcastRoom || event.haveBroadcastRoom
                event.broadcastSoftware = broadcastSoftware || event.broadcastSoftware
                event.scheduledTestDate = scheduledTestDate || event.scheduledTestDate
                event.updatedBy = userId
    
                await event.save();
                if(bannerKey) {
                await s3Service.deleteFile(bannerKey)
                }
                if(watermarkKey) {
                await s3Service.deleteFile(watermarkKey)
                }
                if(trailerKey) {
                await s3Service.deleteFile(trailerKey)
                }
                CreateAdminActivity({
                admin: req.admin.id as mongoose.Types.ObjectId,
                eventData: `Admin updated event with id ${id}`,
                component: 'event',
                activityType: 'updateevent'
                });
                res.status(200).json({ message: 'Event updated successfully', event });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Something went wrong. Please try again later' });
            }
        }

async notifyEventStatus(eventDoc: any, status: EventStatus) {
    // Find all users with a streampass for this event
    const streampasses = await Streampass.find({ event: eventDoc._id }).populate('user');
    const users = streampasses
        .filter(sp => sp?.user)
        .map(sp => sp.user) as unknown as IUser[];
    // Prepare notification details
    const eventName = eventDoc.name;
    const eventDate = new Date(eventDoc.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const eventTime = eventDoc.time;

    // For event started
    if (status === EventStatus.LIVE) {
        // App notifications
        const appUsers = users.filter(u => u.appNotifLiveStreamBegins);
        await sendNotificationToUsers(
            appUsers.map((u: any) => u._id.toString()),
            'Live Stream Started',
            `The event "${eventName}" has started!`,
            { eventId: eventDoc._id.toString() }
        );

        // Email notifications
        const emailUsers = users.filter(u => u.emailNotifLiveStreamBegins);
        for (const user of emailUsers) {
            await EmailService.sendEmail(
                user.email,
                'Live Stream Started',
                'eventLiveStreamBegins', // your email template
                { eventName, eventDate, eventTime, userName: user.firstName, year: new Date().getFullYear() }
            );
        }
    }

    // For event ended
    if (status === EventStatus.PAST) {
        // App notifications
        const appUsers = users.filter(u => u.appNotifLiveStreamEnds);
        await sendNotificationToUsers(
            appUsers.map((u: any) => u._id.toString()),
            'Live Stream Ended',
            `The event "${eventName}" has ended.`,
            { eventId: eventDoc._id.toString() }
        );

        // Email notifications
        const emailUsers = users.filter(u => u.emailNotifLiveStreamEnds);
        for (const user of emailUsers) {
            await EmailService.sendEmail(
                user.email,
                'Live Stream Ended',
                'eventLiveStreamEnds', // your email template
                { eventName, eventDate, eventTime, userName: user.firstName, year: new Date().getFullYear() }
            );
        }
    }
}
  }

  

  export default new EventController();