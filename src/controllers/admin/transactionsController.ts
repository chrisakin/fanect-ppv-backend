import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Transactions, { TransactionStatus } from '../../models/Transactions';
import { paginateAggregate } from '../../services/paginationService';
import { CreateAdminActivity } from '../../services/userActivityService';

/**
 * Controller for admin transaction operations.
 * Provides endpoints to list transactions and retrieve transaction statistics.
 */
class transactionsController {
  /**
   * Get paginated transactions with filtering and search support.
   * - Supports query params: `page`, `limit`, `search`, `status`, `giftStatus`, `paymentMethod`, `currency`, `startDate`, `endDate`, `sortBy`, `sortOrder`.
   * - Joins event and user details and returns a paginated aggregation result.
   * @param req Express request containing optional filter and paging query params
   * @param res Express response with paginated transactions
   */
  async getAllTransactions(req: Request, res: Response) {
          try {
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
            const currencyFilter = req.query.currency as string | undefined;

    if (currencyFilter) {
      const currencies = currencyFilter
        .split(',')
        .map((c) => c.trim());
      filter.currency = { $in: currencies };
    }
    
          const dateMatch: any = {};
          if (startDate) dateMatch.$gte = startDate;
          if (endDate) dateMatch.$lte = endDate;
    
    
            const pipeline: any[] = [
      { 
        $match: {  ...filter } 
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
          eventData: `Admin got all transactions in the system`,
          component: 'users',
          activityType: 'usertransactions'
          })
            res.status(200).json({
              message: 'All transaction history fetched successfully',
              ...result,
            });
          } catch (error) {
            console.error('Error fetching all transaction history:', error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
          }
        }

      /**
       * Get aggregated transaction statistics.
       * - Optional `currency` query param can scope stats to one or more currencies (comma separated).
       * - Returns totals, counts by status, counts by payment method, and gift/non-gift counts.
       * - If a single currency is provided, `totalAmount` is included; otherwise it's omitted.
       * @param req Express request with optional `currency` query param
       * @param res Express response with aggregated statistics
       */
      getTransactionStats = async (req: Request, res: Response) => {
  try {
    const currencyFilter = req.query.currency as string | undefined;

    const match: any = {};
    let currencies: string[] = [];
    if (currencyFilter) {
       currencies = currencyFilter
        .split(',')
        .map((c) => c.trim());
      match.currency = { $in: currencies };
    }
    const isSingleCurrency = currencies.length === 1;

    const [rawStats] = await Transactions.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },

          successful: {
            $sum: { $cond: [{ $eq: ['$status', TransactionStatus.SUCCESSFUL] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', TransactionStatus.PENDING] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', TransactionStatus.FAILED] }, 1, 0] },
          },

          giftTransactions: {
            $sum: { $cond: [{ $eq: ['$isGift', true] }, 1, 0] },
          },
          nonGiftTransactions: {
            $sum: { $cond: [{ $eq: ['$isGift', false] }, 1, 0] },
          },

          flutterwaveCount: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'flutterwave'] }, 1, 0] },
          },
          stripeCount: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'stripe'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalTransactions: 1,
          totalAmount: 1,
          successful: 1,
          pending: 1,
          failed: 1,
          giftTransactions: 1,
          nonGiftTransactions: 1,
          flutterwaveCount: 1,
          stripeCount: 1,
        },
      },
    ]);
      const stats = rawStats || {};
    if (!isSingleCurrency) {
      delete stats.totalAmount;
    }
    if (isSingleCurrency) {
      stats.currency = currencies[0];
    }

    return res.status(200).json({ success: true, stats: stats || {} });
  } catch (error) {
    console.error('Error in getTransactionStats:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};


}
export default new transactionsController();