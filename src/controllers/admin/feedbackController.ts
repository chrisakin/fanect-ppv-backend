import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { paginateAggregate } from '../../services/paginationService';
import { CreateAdminActivity } from '../../services/userActivityService';
import Feedback from '../../models/Feedback';

class feedbackController {
      async getAllFeedbacks(req: Request, res: Response) {
          try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const search = req.query.search as string | undefined;
            const filter: any = {};
            const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
            const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
    
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
        
            const result = await paginateAggregate(Feedback, pipeline, { page, limit });
            CreateAdminActivity({
          admin: req.admin.id as mongoose.Types.ObjectId,
          eventData: `Admin got all feedback in the system`,
          component: 'users',
          activityType: 'userfeedback'
          })
            res.status(200).json({
              message: 'All feedback history fetched successfully',
              ...result,
            });
          } catch (error) {
            console.error('Error fetching all feedback history:', error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
          }
        }
}
export default new feedbackController();