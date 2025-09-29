import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Event, { EventStatus, AdminStatus } from '../../models/Event';
import User, { UserStatus } from '../../models/User';
import Transactions, { TransactionStatus } from '../../models/Transactions';
import Streampass from '../../models/Streampass';
import Views from '../../models/Views';
import Feedback from '../../models/Feedback';
import { CreateAdminActivity } from '../../services/userActivityService';

class AnalyticsController {
  constructor() {
    this.getUserStats = this.getUserStats.bind(this);
    this.getEventStats = this.getEventStats.bind(this);
    this.getRevenueStats = this.getRevenueStats.bind(this);
    this.getEngagementStats = this.getEngagementStats.bind(this);
    this.getRecentActivity = this.getRecentActivity.bind(this);
    this.getTopEvents = this.getTopEvents.bind(this);
    this.getUserGrowthData = this.getUserGrowthData.bind(this);
    this.getRevenueGrowthData = this.getRevenueGrowthData.bind(this);
  }
  // Dashboard Overview Analytics
  getDashboardOverview = async (req: Request, res: Response) => {
    try {
      const { timeframe = '30d', currency } = req.query;
      
      // Calculate date range based on timeframe
      const now = new Date();
      let startDate: Date;
      
      switch (timeframe) {
        case '24h': 
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
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

      const currencyFilter = currency ? { currency: currency as string } : {};

      // Parallel execution of all analytics queries
      const [
        userStats,
        eventStats,
        revenueStats,
        engagementStats,
        recentActivity,
        topEvents,
        userGrowth,
        revenueGrowth,
        currentViewCount
      ] = await Promise.all([
        this.getUserStats(startDate),
        this.getEventStats(startDate),
        this.getRevenueStats(startDate, currencyFilter),
        this.getEngagementStats(startDate),
        this.getRecentActivity(),
        this.getTopEvents(startDate, currencyFilter),
        this.getUserGrowthData(startDate),
        this.getRevenueGrowthData(startDate, currencyFilter),
        this.getCurrentViewCount()
      ]);

      CreateAdminActivity({
        admin: req.admin.id as mongoose.Types.ObjectId,
        eventData: `Admin accessed dashboard overview analytics`,
        component: 'analytics',
        activityType: 'dashboardoverview'
      });

      res.status(200).json({
        message: 'Dashboard analytics retrieved successfully',
        data: {
          timeframe,
          currency: currency || 'all',
          userStats,
          eventStats,
          revenueStats,
          engagementStats,
          recentActivity,
          topEvents,
          currentViewCount,
          charts: {
            userGrowth,
            revenueGrowth
          }
        }
      });

    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      res.status(500).json({ message: 'Something went wrong. Please try again later' });
    }
  }

  // Detailed Analytics Page
   getDetailedAnalytics = async (req: Request, res: Response) => {
    try {
      const { 
        startDate: queryStartDate, 
        endDate: queryEndDate, 
        currency,
        eventStatus,
        userStatus 
      } = req.query;

      const startDate = queryStartDate ? new Date(queryStartDate as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const endDate = queryEndDate ? new Date(queryEndDate as string) : new Date();

      const currencyFilter = currency ? { currency: currency as string } : {};
      const eventStatusFilter = eventStatus ? { status: eventStatus as EventStatus } : {};
      const userStatusFilter = userStatus ? { status: userStatus as UserStatus } : {};

      const [
        platformMetrics,
        financialMetrics,
        userMetrics,
        eventMetrics,
        engagementMetrics,
        geographicData,
        performanceMetrics
      ] = await Promise.all([
        this.getPlatformMetrics(startDate, endDate),
        this.getFinancialMetrics(startDate, endDate, currencyFilter),
        this.getUserMetrics(startDate, endDate, userStatusFilter),
        this.getEventMetrics(startDate, endDate, eventStatusFilter),
        this.getEngagementMetrics(startDate, endDate),
        this.getGeographicData(startDate, endDate),
        this.getPerformanceMetrics(startDate, endDate)
      ]);

      CreateAdminActivity({
        admin: req.admin.id as mongoose.Types.ObjectId,
        eventData: `Admin accessed detailed analytics page`,
        component: 'analytics',
        activityType: 'detailedanalytics'
      });

      res.status(200).json({
        message: 'Detailed analytics retrieved successfully',
        data: {
          dateRange: { startDate, endDate },
          filters: { currency, eventStatus, userStatus },
          platformMetrics,
          financialMetrics,
          userMetrics,
          eventMetrics,
          engagementMetrics,
          geographicData,
          performanceMetrics
        }
      });

    } catch (error) {
      console.error('Error fetching detailed analytics:', error);
      res.status(500).json({ message: 'Something went wrong. Please try again later' });
    }
  }

   async getUserStats(startDate: Date) {
    const [totalUsers, newUsers, activeUsers, verifiedUsers] = await Promise.all([
      User.countDocuments({ isDeleted: { $ne: true } }),
      User.countDocuments({ 
        createdAt: { $gte: startDate },
        isDeleted: { $ne: true }
      }),
      User.countDocuments({ 
        lastLogin: { $gte: startDate },
        isDeleted: { $ne: true }
      }),
      User.countDocuments({ 
        isVerified: true,
        isDeleted: { $ne: true }
      })
    ]);

    return {
      total: totalUsers,
      new: newUsers,
      active: activeUsers,
      verified: verifiedUsers,
      verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(1) : 0
    };
  }

   async getEventStats(startDate: Date) {
    const [totalEvents, newEvents, liveEvents, approvedEvents] = await Promise.all([
      Event.countDocuments({ isDeleted: { $ne: true } }),
      Event.countDocuments({ 
        createdAt: { $gte: startDate },
        isDeleted: { $ne: true }
      }),
      Event.countDocuments({ 
        status: EventStatus.LIVE,
        isDeleted: { $ne: true }
      }),
      Event.countDocuments({ 
        adminStatus: AdminStatus.APPROVED,
        isDeleted: { $ne: true }
      })
    ]);

    return {
      total: totalEvents,
      new: newEvents,
      live: liveEvents,
      approved: approvedEvents,
      approvalRate: totalEvents > 0 ? (approvedEvents / totalEvents * 100).toFixed(1) : 0
    };
  }

   async getRevenueStats(startDate: Date, currencyFilter: any) {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate },
          status: TransactionStatus.SUCCESSFUL,
          ...currencyFilter
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          averageTransaction: { $avg: '$amount' },
          giftTransactions: {
            $sum: { $cond: [{ $eq: ['$isGift', true] }, 1, 0] }
          }
        }
      }
    ];

    const [result] = await Transactions.aggregate(pipeline);
    
    return {
      total: result?.totalRevenue || 0,
      transactions: result?.totalTransactions || 0,
      average: result?.averageTransaction || 0,
      giftTransactions: result?.giftTransactions || 0,
      currency: currencyFilter.currency || 'mixed'
    };
  }

   async getEngagementStats(startDate: Date) {
    const [totalViews, totalStreampassesSold, totalFeedbacks] = await Promise.all([
      Views.countDocuments({ createdAt: { $gte: startDate } }),
      Streampass.countDocuments({ createdAt: { $gte: startDate } }),
      Feedback.countDocuments({ createdAt: { $gte: startDate } })
    ]);

    const avgRating = await Feedback.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: null, avgRating: { $avg: '$ratings' } } }
    ]);

    return {
      totalViews,
      streampassesSold: totalStreampassesSold,
      feedbacks: totalFeedbacks,
      averageRating: avgRating[0]?.avgRating || 0
    };
  }

   async getRecentActivity() {
    const recentEvents = await Event.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name createdAt status adminStatus')
      .populate('createdBy', 'firstName lastName');

    const recentUsers = await User.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName createdAt isVerified');

    return {
      recentEvents,
      recentUsers
    };
  }

  async getCurrentViewCount() {
  const currentViewCount = await Event.aggregate([
    {
      $match: { isDeleted: { $ne: true }, status: EventStatus.LIVE }
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
      $addFields: {
        currentViews: { $size: '$views' }
      }
    },
    {
      $facet: {
        topEvents: [
          { $project: { name: 1, currentViews: 1 } },
          { $sort: { currentViews: -1 } },
          { $limit: 5 }
        ],
        totalViews: [
          { $group: { _id: null, totalViews: { $sum: '$currentViews' } } }
        ]
      }
    },
    {
      $project: {
        topEvents: 1,
        totalViews: { 
          $ifNull: [
      { $arrayElemAt: ['$totalViews.totalViews', 0] },
      0
    ]
         }
      }
    }
  ]);

  return currentViewCount[0];
}


   async getTopEvents(startDate: Date, currencyFilter: any) {
    const pipeline: any = [
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
        $addFields: {
          revenue: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$transactions',
                    cond: {
                      $and: [
                        { $gte: ['$$this.createdAt', startDate] },
                        { $eq: ['$$this.status', TransactionStatus.SUCCESSFUL] },
                        ...(currencyFilter.currency ? [{ $eq: ['$$this.currency', currencyFilter.currency] }] : [])
                      ]
                    }
                  }
                },
                in: '$$this.amount'
              }
            }
          },
          viewCount: { $size: '$views' }
        }
      },
      {
        $match: {
          isDeleted: { $ne: true },
          revenue: { $gt: 0 }
        }
      },
      {
        $sort: { revenue: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          name: 1,
          revenue: 1,
          viewCount: 1,
          status: 1,
          date: 1
        }
      }
    ];

    return await Event.aggregate(pipeline);
  }

   async getUserGrowthData(startDate: Date) {
    const pipeline: any = [
      {
        $match: {
          createdAt: { $gte: startDate },
          isDeleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ];

    return await User.aggregate(pipeline);
  }

   async getRevenueGrowthData(startDate: Date, currencyFilter: any) {
    const pipeline: any = [
      {
        $match: {
          createdAt: { $gte: startDate },
          status: TransactionStatus.SUCCESSFUL,
          ...currencyFilter
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ];

    return await Transactions.aggregate(pipeline);
  }

  // Helper methods for detailed analytics
   async getPlatformMetrics(startDate: Date, endDate: Date) {
    const [
      totalUsers,
      totalEvents,
      totalTransactions,
      totalRevenue
    ] = await Promise.all([
      User.countDocuments({ 
        createdAt: { $gte: startDate, $lte: endDate },
        isDeleted: { $ne: true }
      }),
      Event.countDocuments({ 
        createdAt: { $gte: startDate, $lte: endDate },
        isDeleted: { $ne: true }
      }),
      Transactions.countDocuments({ 
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      Transactions.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: TransactionStatus.SUCCESSFUL
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ])
    ]);

    return {
      users: totalUsers,
      events: totalEvents,
      transactions: totalTransactions,
      revenue: totalRevenue[0]?.total || 0
    };
  }

   async getFinancialMetrics(startDate: Date, endDate: Date, currencyFilter: any) {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          ...currencyFilter
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      }
    ];

    const statusBreakdown = await Transactions.aggregate(pipeline);

    const paymentMethodBreakdown = await Transactions.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          ...currencyFilter
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      }
    ]);

    return {
      statusBreakdown,
      paymentMethodBreakdown
    };
  }

   async getUserMetrics(startDate: Date, endDate: Date, userStatusFilter: any) {
    const userStats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isDeleted: { $ne: true },
          ...userStatusFilter
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          verified: {
            $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
          },
          active: {
            $sum: { $cond: [{ $eq: ['$status', UserStatus.ACTIVE] }, 1, 0] }
          },
          locked: {
            $sum: { $cond: [{ $eq: ['$locked', true] }, 1, 0] }
          }
        }
      }
    ]);

    return userStats[0] || { total: 0, verified: 0, active: 0, locked: 0 };
  }

   async getEventMetrics(startDate: Date, endDate: Date, eventStatusFilter: any) {
    const eventStats = await Event.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isDeleted: { $ne: true },
          ...eventStatusFilter
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ['$adminStatus', AdminStatus.APPROVED] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$adminStatus', AdminStatus.PENDING] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$adminStatus', AdminStatus.REJECTED] }, 1, 0] }
          },
          live: {
            $sum: { $cond: [{ $eq: ['$status', EventStatus.LIVE] }, 1, 0] }
          }
        }
      }
    ]);

    return eventStats[0] || { total: 0, approved: 0, pending: 0, rejected: 0, live: 0 };
  }

   async getEngagementMetrics(startDate: Date, endDate: Date) {
    const [viewStats, feedbackStats] = await Promise.all([
      Views.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]),
      Feedback.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$ratings',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    return {
      views: viewStats,
      ratings: feedbackStats
    };
  }

   async getGeographicData(startDate: Date, endDate: Date) {
    // This would require storing user location data
    // For now, return placeholder data
    return {
      message: 'Geographic data not available - requires location tracking implementation'
    };
  }

   async getPerformanceMetrics(startDate: Date, endDate: Date) {
    const conversionRate = await this.calculateConversionRate(startDate, endDate);
    const averageSessionDuration = await this.calculateAverageSessionDuration(startDate, endDate);

    return {
      conversionRate,
      averageSessionDuration
    };
  }

   async calculateConversionRate(startDate: Date, endDate: Date) {
    const [totalUsers, purchasingUsers] = await Promise.all([
      User.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        isDeleted: { $ne: true }
      }),
      Streampass.distinct('user', {
        createdAt: { $gte: startDate, $lte: endDate }
      }).then(users => users.length)
    ]);

    return totalUsers > 0 ? (purchasingUsers / totalUsers * 100).toFixed(2) : 0;
  }

   async calculateAverageSessionDuration(startDate: Date, endDate: Date) {
    // This would require session tracking
    // Return placeholder for now
    return 'Session tracking not implemented';
  }
}

export default new AnalyticsController();