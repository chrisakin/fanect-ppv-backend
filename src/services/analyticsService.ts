import mongoose from "mongoose";
import { EventStatus, AdminStatus } from "../models/Event";
import { UserStatus } from "../models/User";
import { TransactionStatus } from "../models/Transactions";

/**
 * Build an aggregation pipeline to compute analytics for a single event.
 * - Includes earnings (filtered by month/currency), viewer counts (live/replay/peak),
 *   ratings summary and recent feedback comments, chat message count, and transaction details.
 * - This function returns a MongoDB aggregation pipeline (array) that should be executed
 *   against the `events` collection to compute the analytics server-side.
 * @param eventId ID of the event to analyze
 * @param selectedMonth Optional string in `YYYY-MM` format to filter transactions/earnings by month
 * @param selectedCurrency Optional currency code to restrict revenue calculations
 * @returns Aggregation pipeline array to be used with `Event.aggregate(pipeline)`
 */
export async function getEventAnalytics(
  eventId: string,
  selectedMonth?: string,
  selectedCurrency?: string
) {
  const pipeline: any[] = [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(eventId)
      }
    },

    // Lookup related data
    {
      $lookup: {
        from: 'transactions',
        localField: '_id',
        foreignField: 'event',
        as: 'purchases',
      }
    },
    {
      $lookup: {
        from: 'feedbacks',
        localField: '_id',
        foreignField: 'event',
        as: 'ratings',
      }
    },
    {
      $lookup: {
        from: 'views',
        localField: '_id',
        foreignField: 'event',
        as: 'viewerData',
      }
    },
    {
      $lookup: {
        from: 'chatmessages',
        localField: '_id',
        foreignField: 'event',
        as: 'chatMessages',
      }
    },

    // Analytics summary projection
    {
      $project: {
        _id: 1,
        name: 1,

        // Earnings
        earnings: {
          totalRevenue: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$purchases",
                    as: "purchase",
                    cond: {
                      $and: [
                        selectedCurrency
                          ? { $eq: ["$$purchase.currency", selectedCurrency] }
                          : {},
                        selectedMonth
                          ? {
                              $eq: [
                                {
                                  $dateToString: {
                                    format: "%Y-%m",
                                    date: "$$purchase.createdAt"
                                  }
                                },
                                selectedMonth
                              ]
                            }
                          : {}
                      ]
                    }
                  }
                },
                as: "purchase",
                in: { $toDouble: "$$purchase.amount" }
              }
            }
          },
          totalTransactions: {
            $size: {
              $filter: {
                input: "$purchases",
                as: "purchase",
                cond: {
                  $and: [
                    selectedCurrency
                      ? { $eq: ["$$purchase.currency", selectedCurrency] }
                      : {},
                    selectedMonth
                      ? {
                          $eq: [
                            {
                              $dateToString: {
                                format: "%Y-%m",
                                date: "$$purchase.createdAt"
                              }
                            },
                            selectedMonth
                          ]
                        }
                      : {}
                  ]
                }
              }
            }
          },
          transactions: {
            $map: {
              input: {
                $filter: {
                  input: "$purchases",
                  as: "purchase",
                  cond: {
                    $and: [
                      selectedCurrency
                        ? { $eq: ["$$purchase.currency", selectedCurrency] }
                        : {},
                      selectedMonth
                        ? {
                            $eq: [
                              {
                                $dateToString: {
                                  format: "%Y-%m",
                                  date: "$$purchase.createdAt"
                                }
                              },
                              selectedMonth
                            ]
                          }
                        : {}
                    ]
                  }
                }
              },
              as: "purchase",
              in: {
                date: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$$purchase.createdAt"
                  }
                },
                amount: { $toDouble: "$$purchase.amount" }
              }
            }
          }
        },

        // Viewers
        viewers: {
          total: { $size: "$viewerData" },
          replay: {
            $size: {
              $filter: {
                input: "$viewerData",
                as: "view",
                cond: { $eq: ["$$view.type", "replay"] }
              }
            }
          },
          peak: {
            $max: "$viewerData.concurrentViewers"
          }
        },

        // Ratings
        ratings: {
          avg: { $avg: "$ratings.ratings" },
          count: { $size: "$ratings" },
          breakdown: {
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
                        as: "rating",
                        cond: { $eq: ["$$rating.ratings", "$$star"] }
                      }
                    }
                  }
                }
              }
            }
          }
        },

        // Chat message count
        chat: {
          count: { $size: "$chatMessages" }
        },

        // Feedback list (last 10 comments)
        feedback: {
          $slice: [
            {
              $map: {
                input: {
                  $filter: {
                    input: "$ratings",
                    as: "r",
                    cond: { $ne: ["$$r.comments", null] }
                  }
                },
                as: "f",
                in: {
                  id: { $toString: "$$f._id" },
                  comment: "$$f.comments",
                  rating: "$$f.ratings",
                  userName: "$$f.userName",
                  createdAt: "$$f.createdAt"
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
}

// New analytics functions for admin dashboard
/**
 * Build an aggregation pipeline for a high-level platform overview used in the admin dashboard.
 * - Computes user and event statistics within a given timeframe (e.g., last 7/30/90 days, 1 year).
 * - The returned pipeline is intended to be run against relevant collections (users/events) to
 *   compute totals, verified/active user counts, approved/live event counts, etc.
 * @param timeframe Time window to analyze. Accepted values: '7d', '30d', '90d', '1y'. Defaults to '30d'.
 * @returns Aggregation pipeline array to use with collections like `User.aggregate` or `Event.aggregate`.
 */
export async function getPlatformOverview(timeframe: string = '30d') {
  const now = new Date();
  let startDate: Date;
  
  switch (timeframe) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const pipeline = [
    {
      $facet: {
        userStats: [
          {
            $match: {
              createdAt: { $gte: startDate },
              isDeleted: { $ne: true }
            }
          },
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              verifiedUsers: {
                $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
              },
              activeUsers: {
                $sum: { $cond: [{ $eq: ['$status', UserStatus.ACTIVE] }, 1, 0] }
              }
            }
          }
        ],
        eventStats: [
          {
            $match: {
              createdAt: { $gte: startDate },
              isDeleted: { $ne: true }
            }
          },
          {
            $group: {
              _id: null,
              totalEvents: { $sum: 1 },
              approvedEvents: {
                $sum: { $cond: [{ $eq: ['$adminStatus', AdminStatus.APPROVED] }, 1, 0] }
              },
              liveEvents: {
                $sum: { $cond: [{ $eq: ['$status', EventStatus.LIVE] }, 1, 0] }
              }
            }
          }
        ]
      }
    }
  ];

  return pipeline;
}

/**
 * Build a revenue aggregation pipeline across transactions between two dates.
 * - Groups transactions by date and currency, computes daily revenue, counts and averages,
 *   then reshapes the result so each date contains currency-specific revenue breakdowns.
 * - Only includes transactions with `status: SUCCESSFUL`.
 * @param startDate Inclusive start date for the range
 * @param endDate Inclusive end date for the range
 * @param currency Optional currency code to filter results
 * @returns Aggregation pipeline array to run against the `transactions` collection.
 */
export async function getRevenueAnalytics(
  startDate: Date,
  endDate: Date,
  currency?: string
) {
  const matchStage: any = {
    createdAt: { $gte: startDate, $lte: endDate },
    status: TransactionStatus.SUCCESSFUL
  };

  if (currency) {
    matchStage.currency = currency;
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          currency: '$currency'
        },
        dailyRevenue: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
        averageTransaction: { $avg: '$amount' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        currencies: {
          $push: {
            currency: '$_id.currency',
            revenue: '$dailyRevenue',
            transactions: '$transactionCount',
            average: '$averageTransaction'
          }
        },
        totalDailyRevenue: { $sum: '$dailyRevenue' },
        totalDailyTransactions: { $sum: '$transactionCount' }
      }
    },
    { $sort: { '_id': 1 } }
  ];

  return pipeline;
}

/**
 * Build an aggregation pipeline to compute user engagement metrics between two dates.
 * - Produces time-series for view types (live/replay) and streampass sales (including gifts),
 *   grouped per day. Returned pipeline uses `$facet` to compute multiple series in one aggregation.
 * @param startDate Inclusive start date for the range
 * @param endDate Inclusive end date for the range
 * @returns Aggregation pipeline array to execute against `views`/`streampass` or combined via `$facet`.
 */
export async function getUserEngagementAnalytics(
  startDate: Date,
  endDate: Date
) {
  const pipeline = [
    {
      $facet: {
        viewsData: [
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                type: '$type'
              },
              count: { $sum: 1 }
            }
          },
          {
            $group: {
              _id: '$_id.date',
              viewTypes: {
                $push: {
                  type: '$_id.type',
                  count: '$count'
                }
              },
              totalViews: { $sum: '$count' }
            }
          },
          { $sort: { '_id': 1 } }
        ],
        streampassData: [
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              streampassesSold: { $sum: 1 },
              giftStreampasses: {
                $sum: { $cond: [{ $eq: ['$isGift', true] }, 1, 0] }
              }
            }
          },
          { $sort: { '_id': 1 } }
        ]
      }
    }
  ];

  return pipeline;
}

/**
 * Build an aggregation pipeline to find top-performing content (events) over a date range.
 * - Joins transactions, views and feedback, computes revenue, view counts and average ratings,
 *   and calculates a composite `performanceScore` to rank content.
 * @param startDate Inclusive start date for the analysis window
 * @param endDate Inclusive end date for the analysis window
 * @param limit Maximum number of content items to return (default 10)
 * @returns Aggregation pipeline array to execute against the `events` collection.
 */
export async function getTopPerformingContent(
  startDate: Date,
  endDate: Date,
  limit: number = 10
) {
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        isDeleted: { $ne: true }
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
      $addFields: {
        revenue: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: '$transactions',
                  cond: { $eq: ['$$this.status', TransactionStatus.SUCCESSFUL] }
                }
              },
              in: '$$this.amount'
            }
          }
        },
        viewCount: { $size: '$views' },
        averageRating: { $avg: '$feedbacks.ratings' },
        ratingCount: { $size: '$feedbacks' }
      }
    },
    {
      $addFields: {
        performanceScore: {
          $add: [
            { $multiply: ['$revenue', 0.4] },
            { $multiply: ['$viewCount', 0.3] },
            { $multiply: ['$averageRating', '$ratingCount', 0.3] }
          ]
        }
      }
    },
    {
      $sort: { performanceScore: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        name: 1,
        date: 1,
        status: 1,
        adminStatus: 1,
        revenue: 1,
        viewCount: 1,
        averageRating: 1,
        ratingCount: 1,
        performanceScore: 1,
        bannerUrl: 1
      }
    }
  ];

  return pipeline;
}