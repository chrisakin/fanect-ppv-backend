
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
        createdByModel: 'User'
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
  
}
}

export default new organisersController();