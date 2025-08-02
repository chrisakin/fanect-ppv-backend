
import mongoose from "mongoose";
import User, { UserStatus } from "../../models/User";
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

}

export default new organisersController();