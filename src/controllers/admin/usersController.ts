import { Request, Response } from 'express';
import User, { UserStatus } from '../../models/User';
import { IUser } from '../../models/User';
import mongoose from 'mongoose';
import { paginateAggregate } from '../../services/paginationService';
import Streampass from '../../models/Streampass';
import Activity from '../../models/Activity';
import Transactions, { TransactionStatus } from '../../models/Transactions';
import { create } from 'domain';
import { AdminStatus } from '../../models/Event';
import { EventStatus } from 'aws-sdk/clients/launchwizard';
import { CreateAdminActivity } from '../../services/userActivityService';

class usersController {

 async getAllUsers(req: Request, res: Response) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search as string | undefined;
    const filter: any = {};
     const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;

    if (req.query.status) {
      filter.status = req.query.status as UserStatus;
    }
    if(req.query.verified) {
      filter.isVerified = req.query.verified == 'verified' ? true : false;
    }
    if(req.query.locked) {
      filter.locked = req.query.locked == 'locked' ? true : false;
    }

    const pipeline: any[] = [];

    // Base filters
    pipeline.push({ $match: filter });

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
          createdAt: dateMatch,
        },
      });
    }

    // Search filter
    if (search?.trim()) {
      pipeline.push({
        $match: {
          $or: [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    // Add lookup to Streampass for events joined
    pipeline.push({
      $lookup: {
        from: 'streampasses',
        localField: '_id',
        foreignField: 'user',
        as: 'joinedEvents',
      },
    });

    // Add computed fields
    pipeline.push({
      $addFields: {
        eventsJoinedCount: { $size: '$joinedEvents' },
      },
    });

    // Final projection
    pipeline.push({
      $project: {
        _id: 1,
        firstName: 1,
        lastName: 1,
        username: 1,
        status: 1,
        lastLogin: 1,
        locked: 1,
        eventsJoinedCount: 1,
        createdAt: 1,
        email: 1,
        isVerified:1,
      },
    });

    // Sorting
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrderStr = (req.query.sortOrder as string) || 'asc';
    const sortOrder = sortOrderStr.toLowerCase() === 'desc' ? -1 : 1;

    pipeline.push({ $sort: { [sortBy]: sortOrder } });

    const result = await paginateAggregate(User, pipeline, { page, limit });
    CreateAdminActivity({
    admin: req.admin.id as mongoose.Types.ObjectId,
    eventData: `Admin got all users`,
    component: 'users',
    activityType: 'allusers'
    });
    res.status(200).json({
      message: 'Users gotten successfully',
      ...result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong. Please try again later' });
  }
}

async getUserById(req: Request, res: Response) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  try {
    const pipeline: any[] = [
      {
        $match: { _id: new mongoose.Types.ObjectId(id) }
      },
      {
        $lookup: {
          from: 'streampasses',
          localField: '_id',
          foreignField: 'user',
          as: 'joinedEvents'
        }
      },
      {
        $addFields: {
          eventsJoinedCount: { $size: '$joinedEvents' }
        }
      },
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          username: 1,
          status: 1,
          lastLogin: 1,
          locked: 1,
          eventsJoinedCount: 1,
          createdAt: 1,
          email: 1,
          isVerified: 1
        }
      }
    ];

    const result = await User.aggregate(pipeline);
    

    if (!result || result.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    CreateAdminActivity({
    admin: req.admin.id as mongoose.Types.ObjectId,
    eventData: `Admin viewed a user with id ${id}`,
    component: 'users',
    activityType: 'singleuser'
    });
    res.status(200).json({
      message: 'User retrieved successfully',
      user: result[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong. Please try again later' });
  }
}

async  getEventsJoinedByUser(req: Request, res: Response) {
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
        user: new mongoose.Types.ObjectId(id)
      }
    });

    // Join the event data
    pipeline.push(
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'event'
        }
      },
      {
        $unwind: '$event'
      },
      {
    $replaceRoot: { newRoot: '$event' }
  }
    );

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

    const events = await paginateAggregate(Streampass, pipeline, { page, limit });
    CreateAdminActivity({
    admin: req.admin.id as mongoose.Types.ObjectId,
    eventData: `Admin got all events a user with id ${id} has purchased `,
    component: 'users',
    activityType: 'userevents'
    });
    res.status(200).json({
      message: 'Events joined by user fetched successfully',
      ...events
    });
  } catch (error) {
    console.error('Error fetching events joined by user:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again later' });
  }
}

    async getUserActivities(req: Request, res: Response) {
     const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search as string | undefined;
        const filter: any = {};
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;

        if (req.query.component) {
          filter.component = req.query.component;
        }

        const dateMatch: any = {};
    if (startDate) dateMatch.$gte = startDate;
    if (endDate) dateMatch.$lte = endDate;

    
        const pipeline: any[] = [
          { $match: { user: new mongoose.Types.ObjectId(id), ...filter} },
          { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userDetails' } },
          { $unwind: '$userDetails' },
          { $project: { _id: 1, userName: '$userDetails.firstName', eventData: 1, component: 1, createdAt: 1, activityType: 1 } }
        ];
    
        if (search?.trim()) {
          pipeline.push({
            $match: {
              $or: [
                { eventData: { $regex: search, $options: 'i' } },
              ],
            },
          });
        }

         if (startDate || endDate) {
      pipeline.push({
        $match: {
          createdAt: dateMatch
        }
      });
    }
    
        // Sorting
        const sortBy = (req.query.sortBy as string) || 'createdAt';
        const sortOrderStr = (req.query.sortOrder as string) || 'desc';
        const sortOrder = sortOrderStr.toLowerCase() === 'desc' ? 1 : -1;
    
        pipeline.push({ $sort: { [sortBy]: sortOrder } });
    
        const result = await paginateAggregate(Activity, pipeline, { page, limit });
      CreateAdminActivity({
      admin: req.admin.id as mongoose.Types.ObjectId,
      eventData: `Admin got all activities done by user with id ${id} `,
      component: 'users',
      activityType: 'useractivities'
      });
        res.status(200).json({
          message: 'User activities fetched successfully',
          ...result,
        });
      } catch (error) {
        console.error('Error fetching user activities:', error);
        res.status(500).json({ message: 'Something went wrong. Please try again later' });
      }
    }

    async getUsersTransactionHistory(req: Request, res: Response) {
     const { id } = req.params; 
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
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

      const dateMatch: any = {};
      if (startDate) dateMatch.$gte = startDate;
      if (endDate) dateMatch.$lte = endDate;


        const pipeline: any[] = [
  { 
    $match: { user: new mongoose.Types.ObjectId(id), ...filter, } 
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
          }
        ]
      }
    }
  },
  {
    $project: {
      eventDetails: 0,
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
      eventData: `Admin got all transactions done by user with id ${id} `,
      component: 'users',
      activityType: 'usertransactions'
      })
        res.status(200).json({
          message: 'User transaction history fetched successfully',
          ...result,
        });
      } catch (error) {
        console.error('Error fetching user transaction history:', error);
        res.status(500).json({ message: 'Something went wrong. Please try again later' });
      }
    }


   async lockUser(req: Request, res: Response) {
     const { id } = req.params;
     if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ message: 'Invalid user ID' });
     }
     
     try {
       const user = await User.findById(id);
       if (!user) {
         return res.status(404).json({ message: 'User not found' });
       }
   
       user.status = UserStatus.INACTIVE;
       user.locked = true;
       await user.save();
       CreateAdminActivity({
      admin: req.admin.id as mongoose.Types.ObjectId,
      eventData: `Admin locked user with id ${id} account `,
      component: 'users',
      activityType: 'lockuser'
      })
       return res.status(200).json({
         message: 'User locked successfully',
         user
       });
   
     } catch (error) {
       console.error('Lock user error:', error);
       return res.status(500).json({
         message: 'Something went wrong. Please try again later',
       });
     }
   }

   async unlockUser(req: Request, res: Response) {
     const { id } = req.params;
     if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ message: 'Invalid user ID' });
     }
     
     try {
       const user = await User.findById(id);
       if (!user) {
         return res.status(404).json({ message: 'User not found' });
       }

       user.status = UserStatus.ACTIVE;
       user.locked = false;
       await user.save();
       CreateAdminActivity({
      admin: req.admin.id as mongoose.Types.ObjectId,
      eventData: `Admin unlocked user with id ${id} account `,
      component: 'users',
      activityType: 'unlockuser'
      })
       return res.status(200).json({
         message: 'User unlocked successfully',
         user
       });

     } catch (error) {
       console.error('Unlock user error:', error);
       return res.status(500).json({
         message: 'Something went wrong. Please try again later',
       });
     }
   }

}

export default new usersController();