import { Request, Response } from 'express';
import Event, { Currency, EventStatus } from '../models/Event';
import s3Service from '../services/s3Service';
import { paginateAggregate, paginateFind } from '../services/paginationService';
import { countryToCurrency } from '../types';
import { createChannel, createChatRoom, createChatToken, getStreamKey } from '../services/ivsService';
import Streampass from '../models/Streampass';
import mongoose from 'mongoose';
import { IUser } from '../models/User';
import { sendNotificationToUsers } from '../services/fcmService';
import EmailService from '../services/emailService';

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
                name,
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
          eventDateTime: { $gt: now },
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

   async getLiveEvents(req: Request, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            const result = await paginateFind(
                Event,
                { status: EventStatus.LIVE, published: true },
                { page, limit },
                { __v: 0, createdBy: 0, createdAt: 0, updatedAt: 0, published: 0, status: 0 },
                { date: 1, time: 1 }
            );

            res.status(200).json({ message: 'Events gotten successfully', ...result });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async getPastEvents(req: Request, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            const result = await paginateFind(
                Event,
                { status: EventStatus.PAST, published: true },
                { page, limit },
                { __v: 0, createdBy: 0, createdAt: 0, updatedAt: 0, published: 0, status: 0 },
                { date: -1, time: -1 }
            );

            res.status(200).json({ message: 'Events gotten successfully', ...result });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async getEventById(req: Request, res: Response) {
        const { id } = req.params;
         const userCountry = req.country || 'US'; // default fallback
         const userCurrency = countryToCurrency[userCountry] || Currency.USD;

        try {
            const event = await Event.findById(id).select('-createdBy -createdAt -updatedAt -published -status');
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }
            const priceObj = event.prices.find((p: any) => p.currency === userCurrency || 'USD');
            const eventObj = event.toObject() as Record<string, any>;
            delete eventObj.prices;
            res.status(200).json({message: 'Events gotten successfully', event: {
                ...eventObj,
                price: priceObj || null,
            },});
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
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
    const streampass = await Streampass.findOne({ user: userId, event: eventId });
    if (!streampass) {
        return res.status(403).json({ message: 'No access to this event' });
    }

    const event = await Event.findById(eventId);
    if (!event || !event.ivsChannelArn) {
        return res.status(404).json({ message: 'Event or IVS channel not found' });
    }

    const streamKey = await getStreamKey(event.ivsChannelArn);
    const chatToken = await createChatToken(event.ivsChatRoomArn, userId, (streampass.user as unknown as IUser)?.firstName)
    if (!streamKey || !streamKey) {
        return res.status(500).json({ message: 'Failed to retrieve stream key' });
    }
    res.json({ streamKey: streamKey, chatToken: chatToken });
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

    async ivsWebhook(req: Request, res: Response) {
       try {
        // IVS sends events as JSON in the body
        const { event, channel_arn } = req.body;

        // Log the event for debugging
        console.log('IVS Webhook received:', req.body);

        // Find the event by IVS channel ARN
        const eventDoc = await Event.findOne({ ivsChannelArn: channel_arn });
        if (!eventDoc) {
            return res.status(404).json({ message: 'Event not found for this channel ARN' });
        }

        // Handle stream start and end
        if (event === 'stream-start') {
            eventDoc.status = EventStatus.LIVE;
            await eventDoc.save();
             await this.notifyEventStatus(eventDoc, EventStatus.LIVE);

            // Optionally: notify users here
        } else if (event === 'stream-end') {
            eventDoc.status = EventStatus.PAST;
            await eventDoc.save();
            await this.notifyEventStatus(eventDoc, EventStatus.PAST);
            // Optionally: notify users here
        }

        // You can handle other IVS events here if needed

        res.status(200).send('OK');
    } catch (error) {
        console.error('IVS Webhook error:', error);
        res.status(500).json({ message: 'Something went wrong. Please try again later' });
    }
    res.status(200).send('OK');
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

async getEventAnalytics(eventId: string, selectedMonth: string, selectedCurrency: string) {
  const pipeline = [
    // Match the specific event
    {
      $match: {
        _id: new mongoose.Types.ObjectId(eventId)
      }
    },
    
    // Lookup streampass purchases for this event
    {
      $lookup: {
        from: "streampasses", // or whatever your streampass collection is named
        localField: "_id",
        foreignField: "event",
        as: "purchases"
      }
    },
    
    // Lookup ratings and feedback
    {
      $lookup: {
        from: "ratings", // your ratings collection
        localField: "_id",
        foreignField: "event",
        as: "ratings"
      }
    },
    
    // Lookup viewer analytics (you might need to create this collection)
    {
      $lookup: {
        from: "vieweranalytics", // collection to track viewer data
        localField: "_id",
        foreignField: "event",
        as: "viewerData"
      }
    },
    
    // Lookup chat messages
    {
      $lookup: {
        from: "chatmessages", // your chat messages collection
        localField: "_id",
        foreignField: "event",
        as: "chatMessages"
      }
    },
    
    // Add computed fields
    {
      $addFields: {
        // Filter purchases by selected month if provided
        filteredPurchases: {
          $filter: {
            input: "$purchases",
            cond: selectedMonth ? {
              $eq: [
                { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                selectedMonth
              ]
            } : true
          }
        },
        
        // Filter purchases by currency if provided
        currencyFilteredPurchases: {
          $filter: {
            input: "$purchases",
            cond: selectedCurrency ? {
              $eq: ["$$this.currency", selectedCurrency]
            } : true
          }
        }
      }
    },
    
    // Project the final structure
    {
      $project: {
        _id: 1,
        name: 1,
        
        // Earnings calculations
        earnings: {
          // Total revenue by currency
          totalRevenue: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ["$purchases.currency"] },
                as: "currency",
                in: {
                  k: "$$currency",
                  v: {
                    $sum: {
                      $map: {
                        input: {
                          $filter: {
                            input: "$purchases",
                            cond: { $eq: ["$$this.currency", "$$currency"] }
                          }
                        },
                        as: "purchase",
                        in: { $toDouble: "$$purchase.amount" }
                      }
                    }
                  }
                }
              }
            }
          },
          
          // Monthly revenue by currency
          monthlyRevenue: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ["$purchases.currency"] },
                as: "currency",
                in: {
                  k: "$$currency",
                  v: {
                    $arrayToObject: {
                      $map: {
                        input: {
                          $setUnion: [
                            {
                              $map: {
                                input: {
                                  $filter: {
                                    input: "$purchases",
                                    cond: { $eq: ["$$this.currency", "$$currency"] }
                                  }
                                },
                                as: "purchase",
                                in: { $dateToString: { format: "%Y-%m", date: "$$purchase.createdAt" } }
                              }
                            }
                          ]
                        },
                        as: "month",
                        in: {
                          k: "$$month",
                          v: {
                            $sum: {
                              $map: {
                                input: {
                                  $filter: {
                                    input: "$purchases",
                                    cond: {
                                      $and: [
                                        { $eq: ["$$this.currency", "$$currency"] },
                                        { $eq: [{ $dateToString: { format: "%Y-%m", date: "$$this.createdAt" } }, "$$month"] }
                                      ]
                                    }
                                  }
                                },
                                as: "purchase",
                                in: { $toDouble: "$$purchase.amount" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          
          // Recent transactions
          transactions: {
            $slice: [
              {
                $map: {
                  input: {
                    $sortArray: {
                      input: "$purchases",
                      sortBy: { createdAt: -1 }
                    }
                  },
                  as: "purchase",
                  in: {
                    date: "$$purchase.createdAt",
                    amount: { $toDouble: "$$purchase.amount" },
                    currency: "$$purchase.currency"
                  }
                }
              },
              10
            ]
          }
        },
        
        // Viewer statistics
        viewers: {
          totalViewers: { $size: "$purchases" },
          watchReplayViews: {
            $size: {
              $filter: {
                input: "$viewerData",
                cond: { $eq: ["$$this.type", "replay"] }
              }
            }
          },
          
          // Concurrent viewers data (sample data structure)
          concurrentViewers: {
            $ifNull: [
              {
                $map: {
                  input: { $slice: ["$viewerData", 20] },
                  as: "data",
                  in: {
                    time: { $dateToString: { format: "%H:%M", date: "$$data.timestamp" } },
                    viewers: { $ifNull: ["$$data.concurrentViewers", 0] }
                  }
                }
              },
              [
                { time: "20:00", viewers: 45 },
                { time: "20:15", viewers: 67 },
                { time: "20:30", viewers: 89 },
                { time: "20:45", viewers: 123 },
                { time: "21:00", viewers: 156 },
                { time: "21:15", viewers: 134 },
                { time: "21:30", viewers: 98 },
                { time: "21:45", viewers: 76 },
                { time: "22:00", viewers: 54 }
              ]
            ]
          },
          
          // Drop off data
          dropOff: {
            $ifNull: [
              {
                $map: {
                  input: { $slice: ["$viewerData", 15] },
                  as: "data",
                  in: {
                    time: { $dateToString: { format: "%H:%M", date: "$$data.timestamp" } },
                    viewers: { $ifNull: ["$$data.activeViewers", 0] }
                  }
                }
              },
              [
                { time: "20:00", viewers: 156 },
                { time: "20:10", viewers: 145 },
                { time: "20:20", viewers: 134 },
                { time: "20:30", viewers: 123 },
                { time: "20:40", viewers: 112 },
                { time: "20:50", viewers: 98 },
                { time: "21:00", viewers: 87 },
                { time: "21:10", viewers: 76 },
                { time: "21:20", viewers: 65 }
              ]
            ]
          },
          
          // Peak viewers
          peakViewers: {
            $ifNull: [
              {
                $let: {
                  vars: {
                    maxViewer: {
                      $max: {
                        $map: {
                          input: "$viewerData",
                          as: "data",
                          in: "$$data.concurrentViewers"
                        }
                      }
                    }
                  },
                  in: {
                    count: "$$maxViewer",
                    time: "21:00"
                  }
                }
              },
              { count: 156, time: "21:00" }
            ]
          }
        },
        
        // Chat statistics
        chat: {
          totalMessages: { $size: "$chatMessages" },
          chatActivity: {
            $ifNull: [
              {
                $map: {
                  input: {
                    $slice: [
                      {
                        $sortArray: {
                          input: {
                            $group: {
                              _id: {
                                $dateToString: {
                                  format: "%H:%M",
                                  date: {
                                    $dateTrunc: {
                                      date: "$chatMessages.createdAt",
                                      unit: "minute",
                                      binSize: 15
                                    }
                                  }
                                }
                              },
                              count: { $sum: 1 }
                            }
                          },
                          sortBy: { _id: 1 }
                        }
                      },
                      20
                    ]
                  },
                  as: "activity",
                  in: {
                    time: "$$activity._id",
                    messages: "$$activity.count"
                  }
                }
              },
              [
                { time: "20:00", messages: 12 },
                { time: "20:15", messages: 18 },
                { time: "20:30", messages: 25 },
                { time: "20:45", messages: 31 },
                { time: "21:00", messages: 28 },
                { time: "21:15", messages: 22 },
                { time: "21:30", messages: 15 },
                { time: "21:45", messages: 9 }
              ]
            ]
          }
        },
        
        // Rating statistics
        ratings: {
          averageRating: {
            $ifNull: [
              { $avg: "$ratings.rating" },
              0
            ]
          },
          totalRatings: { $size: "$ratings" },
          ratingBreakdown: {
            $arrayToObject: {
              $map: {
                input: [1, 2, 3, 4, 5],
                as: "star",
                in: {
                  k: { $toString: "$$star" },
                  v: {
                    $size: {
                      $filter: {
                        input: "$ratings",
                        cond: { $eq: ["$$this.rating", "$$star"] }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        
        // Feedback data
        feedback: {
          $slice: [
            {
              $map: {
                input: {
                  $filter: {
                    input: "$ratings",
                    cond: { $ne: ["$$this.comment", null] }
                  }
                },
                as: "rating",
                in: {
                  id: { $toString: "$$rating._id" },
                  comment: "$$rating.comment",
                  author: "$$rating.userName",
                  rating: "$$rating.rating",
                  createdAt: "$$rating.createdAt"
                }
              }
            },
            10
          ]
        }
      }
    }
  ];
  
  return pipeline;
};


async eventStatistics(req: Request, res: Response)  {
  try {
    const { eventId } = req.params;
    const { month: selectedMonth, currency: selectedCurrency } = req.query;
    
    const pipeline: any = this.getEventAnalytics(eventId, selectedMonth as string, selectedCurrency as string);
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
