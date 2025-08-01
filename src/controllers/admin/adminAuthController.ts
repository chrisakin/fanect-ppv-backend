import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import EmailService from '../../services/emailService';
import { OAuth2Client } from 'google-auth-library';
import { getOneAdmin } from '../../services/userService';
import { verifyAppleIdToken } from '../../services/appleAuthService';
import mongoose from 'mongoose';
import Admin, { AdminRolesEnum, AdminStatus } from '../../models/Admin';
import { paginateAggregate } from '../../services/paginationService';

const client = new OAuth2Client(process.env.GOOGLE_LOGIN_CLIENT_ID);

class AuthController {
    constructor() {
        this.register = this.register.bind(this);
        this.login = this.login.bind(this);
        this.forgotPassword = this.forgotPassword.bind(this);
        this.resetPassword = this.resetPassword.bind(this);
        this.resendOtp = this.resendOtp.bind(this);
        this.verifyEmail = this.verifyEmail.bind(this);
        this.googleAuth = this.googleAuth.bind(this);
        this.getProfile = this.getProfile.bind(this);
        this.refreshToken = this.refreshToken.bind(this);
        this.appleAuth = this.appleAuth.bind(this);
        this.updateProfile = this.updateProfile.bind(this);
        this.logout = this.logout.bind(this);
        this.changePassword = this.changePassword.bind(this);
        this.deleteAccount = this.deleteAccount.bind(this);
        this.createAdmin = this.createAdmin.bind(this)
        this.getAllAdmin = this.getAllAdmin.bind(this)
        this.getAdminById = this.getAdminById.bind(this)
    }

    async register(req: Request, res: Response) {
        const { email, password, firstName, lastName } = req.body;

        try {
            if(!email || !password || !firstName || !lastName) {
                return res.status(400).json({ message: 'All fields are required' });
            }
            const existingUser = await Admin.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Admin already exists' });
            }
            const username = email.split('@')[0]; // Use part of the email as username
            const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            if (!isEmailValid) {
                return res.status(400).json({ message: 'Invalid email format' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit code
            const verificationCodeExpires = Date.now() + 3600000; // 1 hour

            const newUser = new Admin({
                username,
                email,
                password: hashedPassword,
                firstName,
                lastName,
                verificationCode,
                verificationCodeExpires,
                isVerified: false,
                roles: AdminRolesEnum.SUPERADMIN,
                status: AdminStatus.INACTIVE
            });

            await newUser.save();

            // Send verification email
            await EmailService.sendEmail(
                email,
                'Email Verification',
                'emailVerification',
                { code: verificationCode, year: new Date().getFullYear()}
            );

            res.status(201).json({ message: 'Verification code sent to your email' });
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async resendOtp(req: Request, res: Response) {
        const { email } = req.body;
    
        try {
            const admin = await Admin.findOne({ email });
    
            if (!admin) {
                return res.status(400).json({ message: 'admin not found' });
            }
    
            if (admin.isVerified) {
                return res.status(400).json({ message: 'admin is already verified' });
            }
            if(admin.isDeleted) {
                return res.status(400).json({ message: 'admin account has been deleted. Kinldy contact support' });
            }
    
            // Generate a new verification code
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit code
            const verificationCodeExpires = Date.now() + 3600000; // 1 hour
    
            admin.verificationCode = verificationCode;
            admin.verificationCodeExpires = verificationCodeExpires;
            await admin.save();
    
            // Resend verification email
            await EmailService.sendEmail(
                email,
                'Resend Email Verification',
                'emailVerification',
                { code: verificationCode, year: new Date().getFullYear() }
            );
    
            res.status(200).json({ message: 'Verification code resent to your email' });
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

        async verifyEmail(req: Request, res: Response) {
  const { email, code } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const user = await Admin.findOne({ email }).session(session);

    if (!user) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Admin not found' });
    }

    if (user.isDeleted) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Admin account has been deleted. Kindly contact support' });
    }

    // if (user.isVerified) {
    //   await session.abortTransaction();
    //   return res.status(400).json({ message: 'Admin is already verified' });
    // }

    if (user.verificationCode !== code || (user.verificationCodeExpires ?? 0) < Date.now()) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    const userId = (user._id as mongoose.Types.ObjectId).toString();
    // ✅ Mark user as verified
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;

    const accessToken = this.generateAccessToken(userId, user.email, user.firstName);
    const refreshToken = this.generateRefreshToken(userId);
    user.refreshToken = refreshToken;
    user.lastLogin = new Date()
    user.status = AdminStatus.ACTIVE;

    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: 'Email verified successfully',
      data: { accessToken, refreshToken },
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Transaction failed:', error);
    return res.status(500).json({ message: 'Something went wrong. Please try again later' });
  }
        }


     private generateAccessToken(userId: string, email: string, name: string): string {
        return jwt.sign({ id: userId, email, name }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    }

     private generateRefreshToken(userId: string): string {
        return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || 'refresh_secret', { expiresIn: '7d' });
    }

    
    async login(req: Request, res: Response) {
        const { email, password } = req.body;

        try {
            const user = await Admin.findOne({ email });
            if (!user) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            if(user.isDeleted) {
                return res.status(400).json({ message: 'Admin account has been deleted. Kinldy contact support' });
            }
            if(user.locked) {
                return res.status(403).json({ message: 'Admin account is locked. Kindly contact support' });
            }
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit code
            const verificationCodeExpires = Date.now() + 3600000; // 1 hour
    
            user.verificationCode = verificationCode;
            user.verificationCodeExpires = verificationCodeExpires;
            await user.save();
    
            // Resend verification email
            await EmailService.sendEmail(
                email,
                'Email Verification',
                'emailVerification',
                { code: verificationCode, year: new Date().getFullYear() }
            );

            res.status(201).json({ message: 'Admin logged in successfully. Please input the otp sent to your email.' });
        } catch (error) {
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async refreshToken(req: Request, res: Response) {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token is required' });
        }

        try {
            const decoded: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh_secret');
            const user = await Admin.findById(decoded.id);

            if (!user || user.refreshToken !== refreshToken) {
                return res.status(403).json({ message: 'Invalid refresh token' });
            }
             if(user.locked) {
                return res.status(403).json({ message: 'User account is locked. Kindly contact support' });
            }

            const newAccessToken = this.generateAccessToken((user._id as string).toString(), user.email, user.firstName);
            res.json({ accessToken: newAccessToken });
        } catch (error) {
            res.status(403).json({ message: 'Invalid or expired refresh token' });
        }
    }

    async getProfile(req: Request, res: Response) {
        const userId = req.admin.id;
        try {
            const user = await getOneAdmin(userId, res);
            if (!user) {
                return res.status(404).json({ message: 'Admin not found' });
            }
            if(user.isDeleted) {
                return res.status(400).json({ message: 'Admin account has been deleted. Kinldy contact support' });
            }
            res.json(user);
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async updateProfile(req: Request, res: Response) {
    const userId = req.admin.id;
    const { firstName, lastName, username, appNotifLiveStreamBegins, appNotifLiveStreamEnds, emailNotifLiveStreamBegins, emailNotifLiveStreamEnds } = req.body;

    try {
        const user = await Admin.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        if(user.isDeleted) {
            return res.status(400).json({ message: 'Admin account has been deleted. Kinldy contact support' });
        }

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if(appNotifLiveStreamBegins) user.appNotifLiveStreamBegins = appNotifLiveStreamBegins;
        if(appNotifLiveStreamEnds) user.appNotifLiveStreamEnds = appNotifLiveStreamEnds;
        if(emailNotifLiveStreamBegins) user.emailNotifLiveStreamBegins = emailNotifLiveStreamBegins;
        if(emailNotifLiveStreamEnds) user.emailNotifLiveStreamEnds = emailNotifLiveStreamEnds;

        await user.save();

        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong. Please try again later' });
    }
}

    async forgotPassword(req: Request, res: Response) {
        const { email, platform } = req.body;

        try {
            const user = await Admin.findOne({ email });
            if (!user) {
                return res.status(400).json({ message: 'Admin not found' });
            }
            if(user.isDeleted) {
                return res.status(400).json({ message: 'Admin account has been deleted. Kinldy contact support' });
            }

            if(platform == 'mobile') {
            const resetToken = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit code
            user.resetPasswordToken = resetToken;
            user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
            await user.save();
            await EmailService.sendEmail(
                user.email,
                'Password Reset',
                'passwordResetMobile',
                { code: resetToken, year: new Date().getFullYear() }
            );
            } else {
            const resetToken = crypto.randomBytes(20).toString('hex');
            user.resetPasswordToken = resetToken;
            user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
            await user.save();
            const resetUrl = `${process.env.ADMIN_FRONTEND_URL}/reset/${resetToken}`;
            await EmailService.sendEmail(
                user.email,
                'Password Reset',
                'passwordReset',
                { resetUrl , year: new Date().getFullYear()}
            );
            }
            res.status(200).json({ message: 'Password reset email sent' });
        } catch (error) {
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async createAdmin(req: Request, res: Response) {
            const { email, firstName, lastName, role } = req.body;
            try {
            if(!email || !firstName || !lastName || !role) {
                return res.status(400).json({ message: 'All fields are required' });
            }
            const existingUser = await Admin.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Admin already exists' });
            }
            const username = email.split('@')[0]; // Use part of the email as username
            const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            if (!isEmailValid) {
                return res.status(400).json({ message: 'Invalid email format' });
            }
            const resetToken = crypto.randomBytes(20).toString('hex');
            const newUser = new Admin({
                username,
                email,
                firstName,
                lastName,
                resetPasswordToken: resetToken,
                resetPasswordExpires: Date.now() + 3600000,
                isVerified: false,
                status: AdminStatus.INACTIVE,
                role
            });
            await newUser.save();
            const resetUrl = `${process.env.ADMIN_FRONTEND_URL}/reset/${resetToken}`;
            await EmailService.sendEmail(
                email,
                'Password Reset',
                'passwordReset',
                { resetUrl , year: new Date().getFullYear()}
            );
            res.status(200).json({ message: 'Admin created successfully and Password create email sent' });
            } catch (error) {
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
            }
    }

    async resetPassword(req: Request, res: Response) {
        const { token } = req.params;
        const { password } = req.body;

        try {
            const user = await Admin.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: Date.now() },
            });

            if (!user) {
                return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
            }
            if(user.isDeleted) {
                return res.status(400).json({ message: 'Admin account has been deleted. Kinldy contact support' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            user.isVerified = true;
            user.lastLogin = new Date();
            user.status = AdminStatus.ACTIVE;
            await user.save();

            res.status(200).json({ message: 'Password has been reset' });
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }


async googleAuth(req: Request, res: Response) {
  const { googleauth, path, token } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: googleauth.id_token,
      audience: process.env.GOOGLE_LOGIN_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid Google token' });
    }

    const { email, given_name: firstName, family_name: lastName } = payload;

    // Check if the user already exists
    let user = await Admin.findOne({ email }).session(session);

    if (!user) {
      if (path === 'signup') {
        // Create a new user if not found
        user = new Admin({
          username: email?.split('@')[0],
          email,
          firstName,
          lastName,
          isVerified: true, // Google accounts are already verified
        });
      } else {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Admin not found, go and signup for an account' });
      }
    }

    if (user && user.isDeleted) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Admin account has been deleted. Kindly contact support' });
    }

    if (user && user.isVerified === false) {
      user.isVerified = true;
      user.verificationCode = undefined;
      user.verificationCodeExpires = undefined;
    }

    // Generate JWT tokens
    const accessToken = this.generateAccessToken((user._id as string).toString(), user.email, user.firstName);
    const refreshToken = this.generateRefreshToken((user._id as string).toString());

    // Store the refresh token
    user.refreshToken = refreshToken;

    // Save user with session
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: 'Google login successful',
      data: { accessToken, refreshToken },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res.status(500).json({ message: 'Something went wrong. Please try again later' });
  }
}



async appleAuth(req: Request, res: Response) {
  const { id_token, path, firstName, lastName } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const appleAdmin = await verifyAppleIdToken(id_token);
    const email = appleAdmin.email;
    const appleId = appleAdmin.sub;

    let user = await Admin.findOne({ $or: [{ email }, { appleId }] }).session(session);

    if (!user) {
      if (path === 'signup') {
        user = new Admin({
          username: email ? email.split('@')[0] : `apple_${appleId}`,
          email,
          appleId,
          firstName,
          lastName,
          isVerified: true,
        });

        const userId = (user._id as mongoose.Types.ObjectId).toString();
      } else {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Admin not found, please sign up.' });
      }
    }

    if (user.isDeleted) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Admin account has been deleted. Kindly contact support.' });
    }

    if (user.isVerified === false) {
      user.isVerified = true;
      user.verificationCode = undefined;
      user.verificationCodeExpires = undefined;
    }

    const accessToken = this.generateAccessToken((user._id as string).toString(), user.email, user.firstName);
    const refreshToken = this.generateRefreshToken((user._id as string).toString());

    user.refreshToken = refreshToken;
    user.appleId = appleId;

    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Apple login successful', data: { accessToken, refreshToken } });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res.status(400).json({ message: 'Apple authentication failed' });
  }
}


    async logout(req: Request, res: Response) {
        const userId = req.admin.id;
        try {
            const user = await Admin.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Admin not found' });
            }
            if(user.isDeleted) {
                return res.status(400).json({ message: 'Admin account has been deleted. Kinldy contact support' });
            }

            user.refreshToken = undefined;
            await user.save();

            res.status(200).json({ message: 'Admin logged out successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async changePassword(req: Request, res: Response) {
        const userId = req.admin.id;
        const { oldPassword, newPassword } = req.body;

        try {
            const user = await Admin.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Admin not found' });
            }
            if(user.isDeleted) {
                return res.status(400).json({ message: 'Admin account has been deleted. Kinldy contact support' });
            }

            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Old password is incorrect' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            await user.save();

            res.status(200).json({ message: 'Password changed successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async deleteAccount(req: Request, res: Response) {
    const userId = req.admin.id;
    try {
        const user = await Admin.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        if(user.isDeleted) {
            return res.status(400).json({ message: 'Admin account has been deleted. Kinldy contact support' });
        }

        user.isDeleted = true;
        await user.save();

        res.status(200).json({ message: 'Account deleted successfully (soft delete)' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong. Please try again later' });
    }
}

 async getAllAdmin(req: Request, res: Response) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search as string | undefined;
    const filter: any = {};
     const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;

    if (req.query.status) {
      filter.status = req.query.status as AdminStatus;
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

    const result = await paginateAggregate(Admin, pipeline, { page, limit });

    res.status(200).json({
      message: 'Admin gotten successfully',
      ...result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong. Please try again later' });
  }
}

async getAdminById(req: Request, res: Response) {
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
          isVerified: 1
        }
      }
    ];

    const result = await Admin.aggregate(pipeline);

    if (!result || result.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.status(200).json({
      message: 'Admin retrieved successfully',
      admin: result[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong. Please try again later' });
  }
}

   async lockUser(req: Request, res: Response) {
     const { id } = req.params;
     if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ message: 'Invalid user ID' });
     }
     
     try {
       const user = await Admin.findById(id);
       if (!user) {
         return res.status(404).json({ message: 'User not found' });
       }
   
       user.status = AdminStatus.INACTIVE;
       user.locked = true;
       await user.save();
   
       return res.status(200).json({
         message: 'Admin locked successfully',
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
       const user = await Admin.findById(id);
       if (!user) {
         return res.status(404).json({ message: 'User not found' });
       }

       user.status = AdminStatus.ACTIVE;
       user.locked = false;
       await user.save();

       return res.status(200).json({
         message: 'Admin unlocked successfully',
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

export default new AuthController();