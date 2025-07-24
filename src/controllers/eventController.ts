import { Request, Response } from 'express';
import Event, { Currency, EventStatus } from '../models/Event';
import s3Service from '../services/s3Service';
import { paginateAggregate, paginateFind } from '../services/paginationService';
import { countryToCurrency } from '../types';
import { createChatToken, deleteChannel, getStreamKeyValue } from '../services/ivsService';
import Streampass from '../models/Streampass';
import mongoose, { Types } from 'mongoose';
import { IUser } from '../models/User';
import { sendNotificationToUsers } from '../services/fcmService';
import EmailService from '../services/emailService';
import { getEventAnalytics } from '../services/analyticsService';
import axios from 'axios';
import Views from '../models/Views';

class EventController {
    async createEvent(req: Request, res: Response) {
        const { name, date, time, description, prices, haveBroadcastRoom, broadcastSoftware, scheduledTestDate } = req.body;
        const userId = req.user.id;
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
                createdByModel: 'User'
            });

            await event.save();
            res.status(201).json({ message: 'Event created successfully', event });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async getEvents(req: Request, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            const result = await paginateFind(
                Event,
                { createdBy: req.user.id },
                { page, limit },
                { __v: 0, createdBy: 0, createdAt: 0, updatedAt: 0, published: 0, status: 0 },
                {createdAt: -1}
            );

            res.status(200).json({ message: 'Events gotten successfully', ...result });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }


async getUpcomingEvents(req: Request, res: Response) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search as string | undefined;
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const userId = req.user?.id as string; 
    const userCountry = req.country || 'US';
    const userCurrency = countryToCurrency[userCountry] || Currency.USD;

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
      {
        $match: {
           eventDateTime: { $gt: yesterday },
          status: EventStatus.UPCOMING, 
          published: true,
        },
      },
        {
        $lookup: {
          from: 'streampasses',
          let: { eventId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$event', '$$eventId'] },
                    { $eq: ['$user', new Types.ObjectId(userId)] }
                  ]
                }
              }
            },
            { $limit: 1 } // optimize
          ],
          as: 'userStreamPass'
        }
      },
      {
    $addFields: {
      hasStreamPass: {
        $gt: [{ $size: { $ifNull: ['$userStreamPass', []] } }, 0]
      }
    }
  },
    ];

    if (search && search.trim() !== '') {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { eventDateTime: 1 } },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          hasStreamPass: 1,
          eventDateTime: 1,
          date: 1,
          time: 1,
          bannerUrl: 1,
          location: 1,
          price: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$prices',
                  as: 'p',
                  cond: { $eq: ['$$p.currency', userCurrency] },
                },
              },
              0,
            ],
          },
        },
      }
    );

    const result = await paginateAggregate(Event, pipeline, { page, limit });

    res.status(200).json({
      message: 'Events gotten successfully',
      ...result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong. Please try again later' });
  }
}

   async getLiveEvents(req: Request, res: Response) {
        try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search as string | undefined;
    const now = new Date();
    const userId = req.user?.id as string; 
    const userCountry = req.country || 'US'; // default fallback
    const userCurrency = countryToCurrency[userCountry] || Currency.USD;

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
      {
        $match: {
        //   eventDateTime: { $gt: now },
          status: EventStatus.LIVE, 
          published: true,
        },
      },
      {
        $lookup: {
          from: 'streampasses',
          let: { eventId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$event', '$$eventId'] },
                    { $eq: ['$user', new Types.ObjectId(userId)] }
                  ]
                }
              }
            },
            { $limit: 1 } // optimize
          ],
          as: 'userStreamPass'
        }
      },
      {
    $addFields: {
      hasStreamPass: {
        $gt: [{ $size: { $ifNull: ['$userStreamPass', []] } }, 0]
      }
    }
  },
    ];

    if (search && search.trim() !== '') {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { eventDateTime: 1 } },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          eventDateTime: 1,
          date: 1,
          time: 1,
          bannerUrl: 1,
          location: 1,
          hasStreamPass: 1,
          price: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$prices',
                  as: 'p',
                  cond: { $eq: ['$$p.currency', userCurrency] },
                },
              },
              0,
            ],
          },
        },
      }
    );

    const result = await paginateAggregate(Event, pipeline, { page, limit });

    res.status(200).json({
      message: 'Events gotten successfully',
      ...result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong. Please try again later' });
  }
    }

    async getPastEvents(req: Request, res: Response) {
        try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search as string | undefined;
    const now = new Date();
    const userCountry = req.country || 'US'; // default fallback
    const userCurrency = countryToCurrency[userCountry] || Currency.USD;

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
      {
        $match: {
        //   eventDateTime: { $gt: now },
          status: EventStatus.PAST, 
          published: true,
        },
      },
    ];

    if (search && search.trim() !== '') {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { eventDateTime: 1 } },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          eventDateTime: 1,
          date: 1,
          time: 1,
          bannerUrl: 1,
          location: 1,
          price: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$prices',
                  as: 'p',
                  cond: { $eq: ['$$p.currency', userCurrency] },
                },
              },
              0,
            ],
          },
        },
      }
    );

    const result = await paginateAggregate(Event, pipeline, { page, limit });

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
  const userId = req.user?.id as string; // from auth middleware
  const userCountry = req.country || 'US';
  const userCurrency = countryToCurrency[userCountry] || Currency.USD;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid event ID' });
  }

  try {
    // Aggregate event and check if user has StreamPass
    const results = await Event.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'streampasses',
          let: { eventId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$event', '$$eventId'] },
                    { $eq: ['$user', new Types.ObjectId(userId)] }
                  ]
                }
              }
            },
            { $limit: 1 } // optimize
          ],
          as: 'userStreamPass'
        }
      },
      {
    $addFields: {
      hasStreamPass: {
        $gt: [{ $size: { $ifNull: ['$userStreamPass', []] } }, 0]
      }
    }
  },
      {
        $project: {
          adminStatus: 0,
          broadcastSoftware:0,
          haveBroadcastRoom: 0,
          scheduledTestDate:0,
          ivsChannelArn:0,
          ivsChatRoomArn: 0,
          ivsPlaybackUrl:0,
          publishedBy:0,
          userStreamPass: 0,
          createdBy: 0,
          createdAt: 0,
          updatedAt: 0,
          published: 0,
          status: 0,
        }
      }
    ]);

    if (!results.length) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = results[0];

    const priceObj = event.prices?.find(
      (p: any) => p.currency === userCurrency
    ) || event.prices?.find((p: any) => p.currency === 'USD' || event.prices?.find((p: any) => p.currency === 'NGN' || event.prices[0]));

    delete event.prices;

    return res.status(200).json({
      message: 'Event fetched successfully',
      event: {
        ...event,
        price: priceObj || null,
      },
    });

  } catch (error) {
    console.error('Get event by ID error:', error);
    return res.status(500).json({
      message: 'Something went wrong. Please try again later',
    });
  }
}

    async updateEvent(req: Request, res: Response) {
        const { id } = req.params;
        const { name, date, time, description, prices, haveBroadcastRoom, broadcastSoftware, scheduledTestDate } = req.body;
        const userId = req.user.id;
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
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }

            if (event.createdBy.toString() !== req.user.id) {
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
            res.status(200).json({ message: 'Event updated successfully', event });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async deleteEvent(req: Request, res: Response) {
        const { id } = req.params;

        try {
            const event = await Event.findById(id);
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }

            if (event.createdBy.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            const bannerKey =  await s3Service.getS3KeyFromUrl(event.bannerUrl)
            const watermarkKey = await s3Service.getS3KeyFromUrl(event.watermarkUrl)

            await event.deleteOne();

            await  s3Service.deleteFile(bannerKey)
            await s3Service.deleteFile(watermarkKey)
            if (event.ivsChannelArn) {
             await deleteChannel(event.ivsChannelArn);
            }
            res.status(200).json({ message: 'Event deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async getStreamKeyForEvent(req: Request, res: Response) {
    const userId = req.user.id;
    const { eventId } = req.params;
    // Check if user has a valid streampass for this event
    const streampass = await Streampass.findOne({ user: userId, event: eventId }).populate('user');
    if (!streampass) {
        return res.status(403).json({ message: 'No access to this event' });
    }
     if(!streampass.event) {
            return res.status(404).json({ message: 'Event not found for this streampass' });
    }
    if(streampass.inSession == true) {
      return res.status(400).json({ message: 'You are already in a session for this streampass' });
    }

    const event = await Event.findById(eventId);
    if (!event || !event.ivsChannelArn) {
        return res.status(404).json({ message: 'Event or IVS channel not found' });
    }

    const streamKey = await getStreamKeyValue(event.ivsChannelArn);
    const chatToken = await createChatToken(event.ivsChatRoomArn, userId, (streampass.user as unknown as IUser)?.username)
    if (!streamKey || !streamKey) {
        return res.status(500).json({ message: 'Failed to retrieve stream key' });
    }
  const savedViews = await Views.findOne({user: userId, event: eventId, type: "live"})
  if(!savedViews) {
    await Views.create({
    user: userId,
    event: eventId,
    type: "live"
  })
  }
    res.json({ streamKey: streamKey, chatToken: chatToken, playbackUrl: event.ivsPlaybackUrl, chatRoomArn: event.ivsChatRoomArn });
}



async getPlaybackUrl(req: Request, res: Response) {
    const userId = req.user.id;
    const { eventId } = req.params;

    const streampass = await Streampass.findOne({ user: userId, event: eventId });
    if (!streampass) {
        return res.status(403).json({ message: 'No access to this event' });
    }

    const event = await Event.findById(eventId);
    if (!event || !event.ivsChannelArn) {
        return res.status(404).json({ message: 'Event or IVS channel not found' });
    }
    // IVS playback URL format: https://{playbackUrl}/index.m3u8
    res.json({ playbackUrl: event.ivsPlaybackUrl });
 }

 async getSavedbroadcastUrl(req: Request, res: Response) {
    const userId = req.user.id;
    const { eventId } = req.params;

    const streampass = await Streampass.findOne({ user: userId, event: eventId });
    if (!streampass) {
        return res.status(403).json({ message: 'No access to this event' });
    }

    const event = await Event.findById(eventId);

    if (!event || !event.ivsChannelArn) {
      return res.status(404).json({ message: 'Event or IVS channel not found' });
    }
     if(!event?.canWatchSavedStream) {
      return res.status(404).json({ message: 'Event not available for rewatching' });
    }
  const savedViews = await Views.findOne({user: userId, event: eventId, type: "replay"})
  if(!savedViews) {
    await Views.create({
    user: userId,
    event: eventId,
    type: "replay"
  })
}
    res.json({ savedBroadcastUrl: event.ivsSavedBroadcastUrl });
 }


//     async ivsWebhook(req: Request, res: Response) {
//        try {
//         // IVS sends events as JSON in the body
//         const { event, channel_arn } = req.body;

//         // Log the event for debugging
//         console.log('IVS Webhook received:', req.body);

//         // Find the event by IVS channel ARN
//         const eventDoc = await Event.findOne({ ivsChannelArn: channel_arn });
//         if (!eventDoc) {
//             return res.status(404).json({ message: 'Event not found for this channel ARN' });
//         }

//         // Handle stream start and end
//         if (event === 'stream-start') {
//             eventDoc.status = EventStatus.LIVE;
//             await eventDoc.save();
//              await this.notifyEventStatus(eventDoc, EventStatus.LIVE);

//             // Optionally: notify users here
//         } else if (event === 'stream-end') {
//             eventDoc.status = EventStatus.PAST;
//             await eventDoc.save();
//             await this.notifyEventStatus(eventDoc, EventStatus.PAST);
//             // Optionally: notify users here
//         }

//         // You can handle other IVS events here if needed

//         res.status(200).send('OK');
//     } catch (error) {
//         console.error('IVS Webhook error:', error);
//         res.status(500).json({ message: 'Something went wrong. Please try again later' });
//     }
//     res.status(200).send('OK');
// }

async ivsWebhook(req: Request, res: Response) {
    let message = req.body;
  try {
    if (typeof message === "string") {
  message = JSON.parse(message);
}
  } catch (err) {
    console.error("Failed to parse SNS message", err);
    return res.status(400).send("Bad request");
  }

  console.log("📨 SNS Message Received:", message);

  // 1️⃣ Handle subscription confirmation
  if (message.Type === "SubscriptionConfirmation") {
    const subscribeUrl = message.SubscribeURL;
    console.log("🔔 Confirming SNS subscription:", subscribeUrl);
    try {
      await axios.get(subscribeUrl);
      console.log("✅ SNS subscription confirmed.");
      return res.send("Subscription confirmed");
    } catch (err) {
      console.error("❌ Failed to confirm subscription:", err);
      return res.status(500).send("Error confirming subscription");
    }
  }

  // 2️⃣ Handle notification
  if (message.Type === "Notification") {
    const detail = JSON.parse(message.Message);
    if (
      detail["detail-type"] === "IVS Recording State Change" &&
      detail.detail.recording_state === "RecordingEnded"
    ) {
      const prefix = detail.detail.s3_recording_prefix;
      const channelArn = detail.detail.channel_arn;

      // Construct the playback URL (replace with your bucket)
      const playbackUrl = `https://YOUR_BUCKET_NAME.s3.amazonaws.com/${prefix}index.m3u8`;

      console.log(`🎬 New recording ready: ${playbackUrl}`, channelArn);

      // TODO: Save playbackUrl to your database here
    }
  }

  res.send("OK");
}

async notifyEventStatus(eventDoc: any, status: EventStatus) {
    // Find all users with a streampass for this event
    const streampasses = await Streampass.find({ event: eventDoc._id }).populate('user');
    const users = streampasses.map(sp => sp.user) as unknown as IUser[];

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


async eventStatistics(req: Request, res: Response)  {
  try {
    const { eventId } = req.params;
    const { month: selectedMonth, currency: selectedCurrency } = req.query;
    
    const pipeline: any = await getEventAnalytics(eventId, selectedMonth as string, selectedCurrency as string);
    const result = await Event.aggregate(pipeline);
    
    if (result.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching event analytics:', error);
    res.status(500).json({ message: 'Internal Something went wrong. Please try again later' });
  }
};
}


export default new EventController();
