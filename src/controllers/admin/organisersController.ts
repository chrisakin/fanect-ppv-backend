
import mongoose from "mongoose";
import { paginateAggregate } from "../../services/paginationService";
import { CreateAdminActivity } from "../../services/userActivityService";
import { Request, Response } from 'express';
import Event, { AdminStatus, EventStatus } from "../../models/Event";

class organisersController {
    
async getAllOrganisers(req: Request, res: Response) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search as string | undefined;

    const userFilter: any = {};
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;

    if (req.query.status) {
      userFilter.status = req.query.status;
    }
    if (req.query.verified) {
      userFilter.isVerified = req.query.verified === 'verified';
    }
    if (req.query.locked) {
      userFilter.locked = req.query.locked === 'locked';
    }

    const pipeline: any[] = [];

    // Match events created by users
    pipeline.push({
      $match: {
        createdByModel: { $ne: 'Admin' }
      }
    });

    // Filter events by date
    if (startDate || endDate) {
      const dateMatch: any = {};
      if (startDate) dateMatch.$gte = startDate;
      if (endDate) dateMatch.$lte = endDate;

      pipeline.push({
        $match: {
          createdAt: dateMatch
        }
      });
    }

    // Group by user and count events
    pipeline.push({
      $group: {
        _id: '$createdBy',
        eventCreated: { $sum: 1 }
      }
    });

    // Lookup user info
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    });

    pipeline.push({ $unwind: '$user' });

    // Apply user filters
    if (Object.keys(userFilter).length > 0) {
      const prefixedFilter: any = {};
      for (const key in userFilter) {
        prefixedFilter[`user.${key}`] = userFilter[key];
      }

      pipeline.push({ $match: prefixedFilter });
    }

    // Search
    if (search?.trim()) {
      pipeline.push({
        $match: {
          $or: [
            { 'user.firstName': { $regex: search, $options: 'i' } },
            { 'user.lastName': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Add event count to user
    pipeline.push({
      $addFields: {
        'user.eventCreated': '$eventCreated'
      }
    });

    // Replace root with user doc
    pipeline.push({
      $replaceWith: '$user'
    });

    // Project fields
    pipeline.push({
      $project: {
        _id: 1,
        firstName: 1,
        lastName: 1,
        username: 1,
        status: 1,
        lastLogin: 1,
        locked: 1,
        createdAt: 1,
        email: 1,
        isVerified: 1,
        eventCreated: 1
      }
    });

    // Sorting
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string || 'desc').toLowerCase() === 'desc' ? -1 : 1;

    pipeline.push({
      $sort: {
        [sortBy]: sortOrder
      }
    });

    // Pagination
    const result = await paginateAggregate(Event, pipeline, { page, limit });

    // Log activity
    CreateAdminActivity({
      admin: req.admin.id as mongoose.Types.ObjectId,
      eventData: `Admin got all organisers`,
      component: 'organisers',
      activityType: 'allusers'
    });

    res.status(200).json({
      message: 'Organisers fetched successfully',
      ...result
    });
  } catch (error) {
    console.error('Error fetching users with events:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again later' });
  }
}



async  getEventsCreatedByOrganiser(req: Request, res: Response) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;

    const filter: any = {};
    if (req.query.status) {
      filter['status'] = req.query.status as EventStatus;
    }
    if (req.query.adminStatus) {
      filter['adminStatus'] = req.query.adminStatus as AdminStatus;
    }
   

    const dateMatch: any = {};
    if (startDate) dateMatch.$gte = startDate;
    if (endDate) dateMatch.$lte = endDate;

    const pipeline: any[] = [];

    // Match user in Streampass (pivot table)
    pipeline.push({
      $match: {
        createdBy: new mongoose.Types.ObjectId(id)
      }
    });

    // Filter by event fields
    if (Object.keys(filter).length > 0) {
      pipeline.push({ $match: filter });
    }
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

    // Date filtering
    if (startDate || endDate) {
      pipeline.push({
        $match: {
          createdAt: dateMatch
        }
      });
    }

    // Project only the necessary fields
    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        date: 1,
        time: 1,
        status: 1,
        adminStatus: 1,
        bannerUrl: 1,
        createdAt: 1,
        prices: 1
      }
    });

    // Sorting
    const sortField = req.query.sortBy as string || 'createdAt';
    const sortOrder = (req.query.sortOrder as string || 'desc').toLowerCase() === 'desc' ? 1 : -1;

    pipeline.push({
      $sort: {
        [sortField]: sortOrder
      }
    });

    const events = await paginateAggregate(Event, pipeline, { page, limit });
    CreateAdminActivity({
    admin: req.admin.id as mongoose.Types.ObjectId,
    eventData: `Admin got all events a user with id ${id} has created `,
    component: 'users',
    activityType: 'userevents'
    });
    res.status(200).json({
      message: 'Events created by user fetched successfully',
      ...events
    });
  } catch (error) {
    console.error('Error fetching events created by user:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again later' });
  }
}

async getOrganiserAnalytics(req: Request, res: Response) {
  const { id } = req.params;
  const { month: selectedMonth, currency: selectedCurrency } = req.query;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid organiser ID' });
  }

  try {
    const pipeline: any[] = [
      {
        $match: {
          createdBy: new mongoose.Types.ObjectId(id),
        }
      },
      {
        $lookup: {
          from: 'transactions',
          localField: '_id',
          foreignField: 'event',
          as: 'transactions'
        }
      },
      {
        $lookup: {
          from: 'views',
          localField: '_id',
          foreignField: 'event',
          as: 'views'
        }
      },
      {
        $lookup: {
          from: 'feedbacks',
          localField: '_id',
          foreignField: 'event',
          as: 'feedbacks'
        }
      },
      {
        $lookup: {
          from: 'streampasses',
          localField: '_id',
          foreignField: 'event',
          as: 'streampasses'
        }
      },
      {
        $group: {
          _id: '$createdBy',
          // Event Statistics
          totalEvents: { $sum: 1 },
          publishedEvents: {
            $sum: { $cond: [{ $eq: ['$published', true] }, 1, 0] }
          },
          approvedEvents: {
            $sum: { $cond: [{ $eq: ['$adminStatus', AdminStatus.APPROVED] }, 1, 0] }
          },
          pendingEvents: {
            $sum: { $cond: [{ $eq: ['$adminStatus', AdminStatus.PENDING] }, 1, 0] }
          },
          rejectedEvents: {
            $sum: { $cond: [{ $eq: ['$adminStatus', AdminStatus.REJECTED] }, 1, 0] }
          },
          liveEvents: {
            $sum: { $cond: [{ $eq: ['$status', EventStatus.LIVE] }, 1, 0] }
          },
          upcomingEvents: {
            $sum: { $cond: [{ $eq: ['$status', EventStatus.UPCOMING] }, 1, 0] }
          },
          pastEvents: {
            $sum: { $cond: [{ $eq: ['$status', EventStatus.PAST] }, 1, 0] }
          },

          // Financial Analytics
          allTransactions: { $push: '$transactions' },
          
          // Engagement Analytics
          allViews: { $push: '$views' },
          allFeedbacks: { $push: '$feedbacks' },
          allStreampasses: { $push: '$streampasses' },

          // Event Details for further processing
          events: {
            $push: {
              _id: '$_id',
              name: '$name',
              date: '$date',
              status: '$status',
              adminStatus: '$adminStatus',
              published: '$published',
              transactions: '$transactions',
              views: '$views',
              feedbacks: '$feedbacks',
              streampasses: '$streampasses'
            }
          }
        }
      },
      {
        $addFields: {
          // Flatten arrays for processing
          flatTransactions: {
            $reduce: {
              input: '$allTransactions',
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] }
            }
          },
          flatViews: {
            $reduce: {
              input: '$allViews',
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] }
            }
          },
          flatFeedbacks: {
            $reduce: {
              input: '$allFeedbacks',
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] }
            }
          },
          flatStreampasses: {
            $reduce: {
              input: '$allStreampasses',
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] }
            }
          }
        }
      },
      {
        $addFields: {
          // Filter transactions by month and currency if specified
          filteredTransactions: {
            $filter: {
              input: '$flatTransactions',
              as: 'transaction',
              cond: {
                $and: [
                  selectedCurrency
                    ? { $eq: ['$$transaction.currency', selectedCurrency] }
                    : true,
                  selectedMonth
                    ? {
                        $eq: [
                          {
                            $dateToString: {
                              format: '%Y-%m',
                              date: '$$transaction.createdAt'
                            }
                          },
                          selectedMonth
                        ]
                      }
                    : true
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          
          // Event Statistics
          eventStats: {
            total: '$totalEvents',
            published: '$publishedEvents',
            approved: '$approvedEvents',
            pending: '$pendingEvents',
            rejected: '$rejectedEvents',
            live: '$liveEvents',
            upcoming: '$upcomingEvents',
            past: '$pastEvents'
          },

          // Financial Analytics
          revenue: {
            total: {
              $sum: {
                $map: {
                  input: '$filteredTransactions',
                  as: 'transaction',
                  in: { $toDouble: '$$transaction.amount' }
                }
              }
            },
            totalTransactions: { $size: '$filteredTransactions' },
            successfulTransactions: {
              $size: {
                $filter: {
                  input: '$filteredTransactions',
                  as: 'transaction',
                  cond: { $eq: ['$$transaction.status', 'Successful'] }
                }
              }
            },
            giftTransactions: {
              $size: {
                $filter: {
                  input: '$filteredTransactions',
                  as: 'transaction',
                  cond: { $eq: ['$$transaction.isGift', true] }
                }
              }
            },
            averageTransactionValue: {
              $cond: [
                { $gt: [{ $size: '$filteredTransactions' }, 0] },
                {
                  $divide: [
                    {
                      $sum: {
                        $map: {
                          input: '$filteredTransactions',
                          as: 'transaction',
                          in: { $toDouble: '$$transaction.amount' }
                        }
                      }
                    },
                    { $size: '$filteredTransactions' }
                  ]
                },
                0
              ]
            }
          },

          // Engagement Analytics
          engagement: {
            totalViews: { $size: '$flatViews' },
            liveViews: {
              $size: {
                $filter: {
                  input: '$flatViews',
                  as: 'view',
                  cond: { $eq: ['$$view.type', 'live'] }
                }
              }
            },
            replayViews: {
              $size: {
                $filter: {
                  input: '$flatViews',
                  as: 'view',
                  cond: { $eq: ['$$view.type', 'replay'] }
                }
              }
            },
            totalStreampassesSold: { $size: '$flatStreampasses' },
            uniqueViewers: {
              $size: {
                $setUnion: {
                  $map: {
                    input: '$flatViews',
                    as: 'view',
                    in: '$$view.user'
                  }
                }
              }
            }
          },

          // Rating Analytics
          ratings: {
            totalRatings: { $size: '$flatFeedbacks' },
            averageRating: {
              $cond: [
                { $gt: [{ $size: '$flatFeedbacks' }, 0] },
                { $avg: '$flatFeedbacks.ratings' },
                0
              ]
            },
            ratingBreakdown: {
              fiveStars: {
                $size: {
                  $filter: {
                    input: '$flatFeedbacks',
                    as: 'feedback',
                    cond: { $eq: ['$$feedback.ratings', 5] }
                  }
                }
              },
              fourStars: {
                $size: {
                  $filter: {
                    input: '$flatFeedbacks',
                    as: 'feedback',
                    cond: { $eq: ['$$feedback.ratings', 4] }
                  }
                }
              },
              threeStars: {
                $size: {
                  $filter: {
                    input: '$flatFeedbacks',
                    as: 'feedback',
                    cond: { $eq: ['$$feedback.ratings', 3] }
                  }
                }
              },
              twoStars: {
                $size: {
                  $filter: {
                    input: '$flatFeedbacks',
                    as: 'feedback',
                    cond: { $eq: ['$$feedback.ratings', 2] }
                  }
                }
              },
              oneStar: {
                $size: {
                  $filter: {
                    input: '$flatFeedbacks',
                    as: 'feedback',
                    cond: { $eq: ['$$feedback.ratings', 1] }
                  }
                }
              }
            }
          },

          // Top Performing Events
          topEvents: {
            $slice: [
              {
                $sortArray: {
                  input: {
                    $map: {
                      input: '$events',
                      as: 'event',
                      in: {
                        _id: '$$event._id',
                        name: '$$event.name',
                        date: '$$event.date',
                        status: '$$event.status',
                        revenue: {
                          $sum: {
                            $map: {
                              input: '$$event.transactions',
                              as: 'transaction',
                              in: { $toDouble: '$$transaction.amount' }
                            }
                          }
                        },
                        views: { $size: '$$event.views' },
                        ratings: {
                          $cond: [
                            { $gt: [{ $size: '$$event.feedbacks' }, 0] },
                            { $avg: '$$event.feedbacks.ratings' },
                            0
                          ]
                        },
                        streampassesSold: { $size: '$$event.streampasses' }
                      }
                    }
                  },
                  sortBy: { revenue: -1 }
                }
              },
              5
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'organiserInfo'
        }
      },
      {
        $unwind: '$organiserInfo'
      },
      {
        $project: {
          organiser: {
            _id: '$organiserInfo._id',
            firstName: '$organiserInfo.firstName',
            lastName: '$organiserInfo.lastName',
            email: '$organiserInfo.email',
            username: '$organiserInfo.username',
            joinedDate: '$organiserInfo.createdAt'
          },
          eventStats: 1,
          revenue: 1,
          engagement: 1,
          ratings: 1,
          topEvents: 1
        }
      }
    ];

    const result = await Event.aggregate(pipeline);

    if (!result || result.length === 0) {
      return res.status(404).json({ message: 'Organiser not found or has no events' });
    }

    // Log admin activity
    CreateAdminActivity({
      admin: req.admin.id as mongoose.Types.ObjectId,
      eventData: `Admin viewed analytics for organiser with id ${id}`,
      component: 'organisers',
      activityType: 'organiseranalytics'
    });

    res.status(200).json({
      message: 'Organiser analytics fetched successfully',
      analytics: result[0]
    });

  } catch (error) {
    console.error('Error fetching organiser analytics:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again later' });
  }
}
}

export default new organisersController();