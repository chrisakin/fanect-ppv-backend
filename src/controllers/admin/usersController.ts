import { Request, Response } from 'express';
import User, { UserStatus } from '../../models/User';
import { IUser } from '../../models/User';
import mongoose from 'mongoose';
import { paginateAggregate } from '../../services/paginationService';

class usersController {
    constructor() {}

   async getAllUsers(req: Request, res: Response) {
     try {
       const page = Number(req.query.page) || 1;
       const limit = Number(req.query.limit) || 10;
       const search = req.query.search as string | undefined;
       const filter: any = {};
   
       if (req.query.status) {
         filter.status = req.query.status as UserStatus;
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