import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import EmailService from '../services/emailService';
import { OAuth2Client } from 'google-auth-library';
import { getOneUser } from '../services/userService';
import { verifyAppleIdToken } from '../services/appleAuthService';
import Gift from '../models/Gift';
import Streampass from '../models/Streampass';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from "uuid";

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
        this.getGiftsAndUpdateStreamPass = this.getGiftsAndUpdateStreamPass.bind(this)
        this.getGoogleClientId = this.getGoogleClientId(this)
    }

    async register(req: Request, res: Response) {
        const { email, password, firstName, lastName, userName } = req.body;

        try {
            if(!email || !password || !firstName || !lastName || !userName) {
                return res.status(400).json({ message: 'All fields are required' });
            }
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }
            const username = userName || email.split('@')[0]; // Use part of the email as username
            const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            if (!isEmailValid) {
                return res.status(400).json({ message: 'Invalid email format' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit code
            const verificationCodeExpires = Date.now() + 3600000; // 1 hour

            const newUser = new User({
                username,
                email,
                password: hashedPassword,
                firstName,
                lastName,
                verificationCode,
                verificationCodeExpires,
                isVerified: false,
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
            const user = await User.findOne({ email });
    
            if (!user) {
                return res.status(400).json({ message: 'User not found' });
            }
    
            if (user.isVerified) {
                return res.status(400).json({ message: 'User is already verified' });
            }
            if(user.isDeleted) {
                return res.status(400).json({ message: 'User account has been deleted. Kinldy contact support' });
            }
    
            // Generate a new verification code
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit code
            const verificationCodeExpires = Date.now() + 3600000; // 1 hour
    
            user.verificationCode = verificationCode;
            user.verificationCodeExpires = verificationCodeExpires;
            await user.save();
    
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
    const sessionToken = uuidv4();
    const user = await User.findOne({ email }).session(session);

    if (!user) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.isDeleted) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'User account has been deleted. Kindly contact support' });
    }

    if (user.isVerified) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'User is already verified' });
    }

    if (user.verificationCode !== code || (user.verificationCodeExpires ?? 0) < Date.now()) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // ✅ Update associated streampasses and gifts
    const userId = (user._id as mongoose.Types.ObjectId).toString();
    await this.getGiftsAndUpdateStreamPass(email, userId, session)

    // ✅ Mark user as verified
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;

    const accessToken = this.generateAccessToken(userId, user.email, user.firstName);
    const refreshToken = this.generateRefreshToken(userId);
    user.refreshToken = refreshToken;
    user.sessionToken = sessionToken
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: 'Email verified successfully',
      data: { accessToken, refreshToken, sessionToken },
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
        const sessionToken = uuidv4();
        try {
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            if(user.isDeleted) {
                return res.status(400).json({ message: 'User account has been deleted. Kinldy contact support' });
            }
            if(user.isVerified === false) {
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
            return res.status(400).json({ message: 'User is not verified' });
            }

            const accessToken = this.generateAccessToken(((user._id as string).toString()), user.email, user.firstName);
            const refreshToken = this.generateRefreshToken(((user._id as string).toString()));

            // Optionally store the refresh token in the database
            user.refreshToken = refreshToken;
            user.sessionToken = sessionToken
            await user.save();

            res.status(201).json({ message: 'User logged in successfully', data: { accessToken, refreshToken, sessionToken } });
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
            const decoded: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string);
            const user = await User.findById(decoded.id);
            if (!user || user.refreshToken !== refreshToken) {
                return res.status(403).json({ message: 'Invalid refresh token' });
            }

            const newAccessToken = this.generateAccessToken((user._id as string).toString(), user.email, user.firstName);
            res.json({ accessToken: newAccessToken });
        } catch (error) {
            res.status(403).json({ message: 'Invalid or expired refresh token' });
        }
    }

    async getProfile(req: Request, res: Response) {
        const userId = req.user.id;
        try {
            const user = await getOneUser(userId, res);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            if(user.isDeleted) {
                return res.status(400).json({ message: 'User account has been deleted. Kinldy contact support' });
            }
            res.json(user);
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async updateProfile(req: Request, res: Response) {
    const userId = req.user.id;
    const { firstName, lastName, username, appNotifLiveStreamBegins, appNotifLiveStreamEnds, emailNotifLiveStreamBegins, emailNotifLiveStreamEnds } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if(user.isDeleted) {
            return res.status(400).json({ message: 'User account has been deleted. Kinldy contact support' });
        }

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (username) user.username = username;
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
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(400).json({ message: 'User not found' });
            }
            if(user.isDeleted) {
                return res.status(400).json({ message: 'User account has been deleted. Kinldy contact support' });
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
            const resetUrl = `${process.env.FRONTEND_URL}/reset/${resetToken}`;
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

    async resetPassword(req: Request, res: Response) {
        const { token } = req.params;
        const { password } = req.body;

        try {
            const user = await User.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: Date.now() },
            });

            if (!user) {
                return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
            }
            if(user.isDeleted) {
                return res.status(400).json({ message: 'User account has been deleted. Kinldy contact support' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            res.status(200).json({ message: 'Password has been reset' });
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    getGoogleClientId(platform: string) {
    if (platform === 'android') return process.env.ANDROID_GOOGLE_LOGIN_CLIENT_ID;
    if (platform === 'ios') return process.env.IOS_GOOGLE_LOGIN_CLIENT_ID;
    return process.env.GOOGLE_LOGIN_CLIENT_ID; // web
    }


async googleAuth(req: Request, res: Response) {
  const { googleauth, path, token, platform } = req.body;
  const session = await mongoose.startSession();
  const sessionToken = uuidv4();
  try {
    session.startTransaction();

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: googleauth.id_token,
      audience: this.getGoogleClientId(platform),
    });

    const payload = ticket.getPayload();
    if (!payload) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid Google token' });
    }

    const { email, given_name: firstName, family_name: lastName } = payload;

    // Check if the user already exists
    let user = await User.findOne({ email }).session(session);

    if (!user) {
      if (path === 'signup') {
        // Create a new user if not found
        user = new User({
          username: email?.split('@')[0],
          email,
          firstName,
          lastName,
          isVerified: true, // Google accounts are already verified
        });

        const userId = (user._id as mongoose.Types.ObjectId).toString();

        // Update associated streampasses and gifts
        await this.getGiftsAndUpdateStreamPass(email as string, userId, session);
      } else {
        await session.abortTransaction();
        return res.status(400).json({ message: 'User not found, go and signup for an account' });
      }
    }

    if (user && user.isDeleted) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'User account has been deleted. Kindly contact support' });
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
    user.sessionToken = sessionToken

    // Save user with session
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: 'Google login successful',
      data: { accessToken, refreshToken, sessionToken },
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
  const sessionToken = uuidv4();

  try {
    session.startTransaction();

    const appleUser = await verifyAppleIdToken(id_token);
    const email = appleUser.email;
    const appleId = appleUser.sub;

    let user = await User.findOne({ $or: [{ email }, { appleId }] }).session(session);

    if (!user) {
      if (path === 'signup') {
        user = new User({
          username: email ? email.split('@')[0] : `apple_${appleId}`,
          email,
          appleId,
          firstName,
          lastName,
          isVerified: true,
        });

        const userId = (user._id as mongoose.Types.ObjectId).toString();

        // Update associated gifts and streampasses
        await this.getGiftsAndUpdateStreamPass(email as string, userId, session);
      } else {
        await session.abortTransaction();
        return res.status(400).json({ message: 'User not found, please sign up.' });
      }
    }

    if (user.isDeleted) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'User account has been deleted. Kindly contact support.' });
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
    user.sessionToken = sessionToken

    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Apple login successful', data: { accessToken, refreshToken, sessionToken } });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res.status(400).json({ message: 'Apple authentication failed' });
  }
}


    async logout(req: Request, res: Response) {
        const userId = req.user.id;
        try {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            if(user.isDeleted) {
                return res.status(400).json({ message: 'User account has been deleted. Kinldy contact support' });
            }

            user.refreshToken = undefined;
            user.sessionToken = undefined
            await user.save();

            res.status(200).json({ message: 'User logged out successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async changePassword(req: Request, res: Response) {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        try {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            if(user.isDeleted) {
                return res.status(400).json({ message: 'User account has been deleted. Kinldy contact support' });
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
    const userId = req.user.id;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if(user.isDeleted) {
            return res.status(400).json({ message: 'User account has been deleted. Kinldy contact support' });
        }

        user.isDeleted = true;
        await user.save();

        res.status(200).json({ message: 'Account deleted successfully (soft delete)' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong. Please try again later' });
    }
}

async getGiftsAndUpdateStreamPass(email: string, userId: string, session: any) {
  try {
    const [giftResult, streampassResult] = await Promise.all([
      Gift.updateMany(
        { receiversEmail: email, hasConverted: false },
        { $set: { hasConverted: true, user: userId } },
        { session }
      ),
      Streampass.updateMany(
        { email: email, hasConverted: false },
        { $set: { hasConverted: true, user: userId } },
        { session }
      )
    ]);

    return {
      giftModified: giftResult.modifiedCount,
      streampassModified: streampassResult.modifiedCount,
    };
  } catch (error) {
    console.error('Error updating gifts or streampasses:', error);
    throw new Error('Failed to update gifted streampasses');
  }
}

}

export default new AuthController();
