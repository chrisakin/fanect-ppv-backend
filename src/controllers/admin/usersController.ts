import { Request, Response } from 'express';
import User, { UserStatus } from '../../models/User';
import { IUser } from '../../models/User';
import mongoose from 'mongoose';
import { paginateAggregate } from '../../services/paginationService';
import Streampass from '../../models/Streampass';
import Activity from '../../models/Activity';
import Transactions from '../../models/Transactions';
import { create } from 'domain';

class usersController {

 async getAllUsers(req: Request, res: Response) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search as string | undefined;
    const filter: any = {};

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
    const sortOrderStr = (req.query.sortOrder as string) || 'desc';
    const sortOrder = sortOrderStr.toLowerCase() === 'desc' ? -1 : 1;

    pipeline.push({ $sort: { [sortBy]: sortOrder } });

    const result = await paginateAggregate(User, pipeline, { page, limit });

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
       return res.status(400).json({ message: 'Invalid event ID' });
     }
     
     try {
       const results = await User.findById(id).select('-password -refreshToken -resetPasswordToken -resetPasswordExpires -verificationCode -verificationCodeExpires -__v');
   
       if (!results) {
         return res.status(404).json({ message: 'User not found' });
       }
   
       return res.status(200).json({
         message: 'User fetched successfully',
         results
       });
   
     } catch (error) {
       console.error('Get user by ID error:', error);
       return res.status(500).json({
         message: 'Something went wrong. Please try again later',
       });
     }
   }

   async getEventsJoinedByUser(req: Request, res: Response) {
     const { id } = req.params; 
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
       try {
       const page = Number(req.query.page) || 1;
       const limit = Number(req.query.limit) || 10;
       const search = req.query.search as string | undefined;
       const filter: any = {};
   
       if (req.query.status) {
         filter.status = req.query.status as UserStatus;
       }
     const pipeline: any[] = [
  {
    $match: { user: new mongoose.Types.ObjectId(id) }
  },
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
    $project: {
      _id: 0,
      event: {
        _id: 1,
        title: 1,
        description: 1,
        date: 1,
        time: 1,
        location: 1
      }
    }
  }
];
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
   
       // Sorting
       const sortBy = (req.query.sortBy as string) || 'createdAt';
       const sortOrderStr = (req.query.sortOrder as string) || 'desc';
       const sortOrder = sortOrderStr.toLowerCase() === 'desc' ? -1 : 1;
   
       pipeline.push({ $sort: { [sortBy]: sortOrder } });
        const events = await paginateAggregate(Streampass, pipeline, { page, limit });
        res.status(200).json({ message: 'Events joined by user fetched successfully', events });
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
    
        if (req.query.status) {
          filter.status = req.query.status as UserStatus;
        }
    
        const pipeline: any[] = [
          { $match: { user: new mongoose.Types.ObjectId(id) } },
          { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userDetails' } },
          { $unwind: '$userDetails' },
          { $project: { _id: 1, userName: '$userDetails.firstName', eventData: 1, component: 1, createdAt: 1, activityType: 1 } }
        ];
    
        if (search?.trim()) {
          pipeline.push({
            $match: {
              $or: [
                { 'userDetails.firstName': { $regex: search, $options: 'i' } },
                { 'userDetails.lastName': { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
              ],
            },
          });
        }
    
        // Sorting
        const sortBy = (req.query.sortBy as string) || 'createdAt';
        const sortOrderStr = (req.query.sortOrder as string) || 'desc';
        const sortOrder = sortOrderStr.toLowerCase() === 'desc' ? -1 : 1;
    
        pipeline.push({ $sort: { [sortBy]: sortOrder } });
    
        const result = await paginateAggregate(Activity, pipeline, { page, limit });
    
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
    
        if (req.query.status) {
          filter.status = req.query.status as UserStatus;
        }
        if(req.query.giftStatus) {
          filter.isGift = req.query.giftStatus === 'gift' ? true : false;
        }
    
        // const pipeline: any[] = [
        //   { $match: { user: new mongoose.Types.ObjectId(id) } },
        //   { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'eventDetails' } },
        //   { $unwind: '$eventDetails' },
        //   { $project: { _id: 1, eventName: '$eventDetails.name', eventDate: '$eventDetails.date', eventTime: '$eventDetails.time', status: '$eventDetails.status', adminStatus: '$eventDetails.adminStatus'} }
        // ];

        const pipeline: any[] = [
  { 
    $match: { user: new mongoose.Types.ObjectId(id) } 
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
      eventDetails: 0, // optional: remove full eventDetails if not needed
      event: 0         // optional: remove event ID if not needed
    }
  }
];
    
        if (search?.trim()) {
          pipeline.push({
            $match: {
              $or: [
                { 'transactionDetails.data': { $regex: search, $options: 'i' } },
                { amount: { $regex: search, $options: 'i' } },
              ],
            },
          });
        }
    
        // Sorting
        const sortBy = (req.query.sortBy as string) || 'createdAt';
        const sortOrderStr = (req.query.sortOrder as string) || 'desc';
        const sortOrder = sortOrderStr.toLowerCase() === 'desc' ? -1 : 1;
    
        pipeline.push({ $sort: { [sortBy]: sortOrder } });
    
        const result = await paginateAggregate(Transactions, pipeline, { page, limit });
    
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