import { Request, Response } from 'express';
import User, { UserStatus } from '../models/User';
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
import { CreateActivity } from '../services/userActivityService';

const client = new OAuth2Client(process.env.GOOGLE_LOGIN_CLIENT_ID);

/**
 * Controller responsible for user authentication and profile management.
 * Contains methods for registration, login, social auth (Google/Apple),
 * password reset flows, profile updates, and helper methods for token generation
 * and conversion of gifted streampasses/gifts to user-owned records.
 */
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
    }

    /**
     * Register a new user.
     * - Validates required fields, checks for existing users, hashes the password,
     *   creates the user record, sends verification email and logs the activity.
     * @param req Express request containing `email`, `password`, `firstName`, `lastName`, `userName` in body
     * @param res Express response
     */
    async register(req: Request, res: Response) {
        const { email, password, firstName, lastName, userName } = req.body;

        try {
            if(!email || !password || !firstName || !lastName || !userName) {
                return res.status(400).json({ message: 'All fields are required' });
            }
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }
            const username = userName || email.split('@')[0]; // Use part of the email as username
            const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase());
            if (!isEmailValid) {
                return res.status(400).json({ message: 'Invalid email format' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit code
            const verificationCodeExpires = Date.now() + 3600000; // 1 hour

            const newUser = new User({
                username,
                email: email.toLowerCase(),
                password: hashedPassword,
                firstName,
                lastName,
                verificationCode,
                verificationCodeExpires,
                isVerified: false,
                status: UserStatus.INACTIVE
            });

            await newUser.save();
            CreateActivity({
                user: newUser._id as mongoose.Types.ObjectId,
                eventData: `New User registered an account with email: ${email.toLowerCase()}`,
                component: 'auth',
                activityType: 'registration'
            });
            // Send verification email
            await EmailService.sendEmail(
                email.toLowerCase(),
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
        /**
         * Resend the email verification OTP to a user.
         * - Looks up the user by email, ensures account exists and is not deleted/verified,
         *   generates a new OTP, saves it and sends the verification email.
         * @param req Express request containing `email` in body
         * @param res Express response
         */
        const { email } = req.body;
    
        try {
            const user = await User.findOne({ email: email.toLowerCase() });
    
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
            CreateActivity({
                user: user._id as mongoose.Types.ObjectId,
                eventData: `User requested for resend of verification code for email: ${email.toLowerCase()}`,
                component: 'auth',
                activityType: 'resendotp'
            });
            // Resend verification email
            await EmailService.sendEmail(
                email.toLowerCase(),
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

        /**
         * Verify a user's email using a one-time code (OTP).
         * - Uses a mongoose transaction to atomically convert any gifted streampasses/gifts,
         *   mark the user as verified, create session/refresh tokens and return them.
         * @param req Express request containing `email` and `code` in body
         * @param res Express response with access and refresh tokens
         */
        async verifyEmail(req: Request, res: Response) {
  const { email, code } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const sessionToken = uuidv4();
    const user = await User.findOne({ email: email.toLowerCase() }).session(session);

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
    await this.getGiftsAndUpdateStreamPass(email.toLowerCase(), userId, session)

    // ✅ Mark user as verified
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;

    const accessToken = this.generateAccessToken(userId, user.email, user.firstName);
    const refreshToken = this.generateRefreshToken(userId);
    user.refreshToken = refreshToken;
    user.sessionToken = sessionToken
    user.lastLogin = new Date();
    user.status = UserStatus.ACTIVE;
    await user.save({ session });
    CreateActivity({
      user: user._id as mongoose.Types.ObjectId,  
      eventData: `User sucessfully verified email (${email.toLowerCase()})`,
      component: 'auth',
      activityType: 'verifyemail'
    });
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


     /**
      * Generate a signed JWT access token (short-lived).
      * @param userId ID of the user
      * @param email User email
      * @param name User first name (included in token payload)
      * @returns Signed JWT access token string
      */
     private generateAccessToken(userId: string, email: string, name: string): string {
        return jwt.sign({ id: userId, email, name }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    }

     /**
      * Generate a signed JWT refresh token (longer-lived).
      * @param userId ID of the user
      * @returns Signed JWT refresh token string
      */
     private generateRefreshToken(userId: string): string {
        return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || 'refresh_secret', { expiresIn: '7d' });
    }

    
    async login(req: Request, res: Response) {
        /**
         * Authenticate a user with email and password.
         * - Validates credentials, checks account state (deleted/locked/verified),
         *   issues access and refresh tokens and records a session token.
         * @param req Express request with `email` and `password` in body
         * @param res Express response with tokens on success
         */
        const { email, password } = req.body;
        const sessionToken = uuidv4();
        try {
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            if(user.isDeleted) {
                return res.status(400).json({ message: 'User account has been deleted. Kindly contact support' });
            }

            if(user.locked) {
                return res.status(403).json({ message: 'User account is locked. Kindly contact support' });
            }
            if(user.isVerified === false) {
                const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit code
            const verificationCodeExpires = Date.now() + 3600000; // 1 hour
    
            user.verificationCode = verificationCode;
            user.verificationCodeExpires = verificationCodeExpires;
            await user.save();
                CreateActivity({
                    user: user._id as mongoose.Types.ObjectId,   
                    eventData: `User sucessfully loggedin but is not verified with email: ${email.toLowerCase()}`,
                    component: 'auth',
                    activityType: 'login'
                });
            // Resend verification email
            await EmailService.sendEmail(
                email.toLowerCase(),
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
            user.lastLogin = new Date();
            await user.save();
              CreateActivity({
                    user: user._id as mongoose.Types.ObjectId,
                    eventData: `User sucessfully loggedin`,
                    component: 'auth',
                    activityType: 'login'
                });
            res.status(201).json({ message: 'User logged in successfully', data: { accessToken, refreshToken, sessionToken } });
        } catch (error) {
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async refreshToken(req: Request, res: Response) {
        /**
         * Exchange a refresh token for a new access token.
         * - Validates the refresh token, ensures it matches the stored token, and returns a new access token.
         * @param req Express request containing `refreshToken` in body
         * @param res Express response with new access token
         */
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

             if(user.locked) {
                return res.status(403).json({ message: 'User account is locked. Kindly contact support' });
            }

            const newAccessToken = this.generateAccessToken((user._id as string).toString(), user.email, user.firstName);
            CreateActivity({
               user: user._id as mongoose.Types.ObjectId,
               eventData: `Refresh token granted to user`,
               component: 'auth',
               activityType: 'refreshtoken'
            });
            res.json({ accessToken: newAccessToken });
        } catch (error) {
            res.status(403).json({ message: 'Invalid or expired refresh token' });
        }
    }

    async getProfile(req: Request, res: Response) {
        /**
         * Retrieve the authenticated user's profile.
         * - Uses `req.user.id` populated by authentication middleware.
         * @param req Express request with authenticated `user.id`
         * @param res Express response with user profile
         */
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
    /**
     * Update profile fields for the authenticated user.
     * - Accepts optional fields and persists changes, then logs activity.
     * @param req Express request with authenticated `user.id` and updated fields in body
     * @param res Express response
     */
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
        CreateActivity({
           user: user._id as mongoose.Types.ObjectId,
           eventData: `User updated profile information`,
           component: 'auth',
           activityType: 'profile'
        });
        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong. Please try again later' });
    }
}

    async forgotPassword(req: Request, res: Response) {
        /**
         * Initiate a password reset flow for a user.
         * - Supports mobile (OTP) and web (token link) flows; sends an email with reset instructions.
         * @param req Express request containing `email` and optional `platform` in body
         * @param res Express response
         */
        const { email, platform } = req.body;

        try {
            const user = await User.findOne({ email: email.toLowerCase() });
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
            CreateActivity({
           user: user._id as mongoose.Types.ObjectId,
           eventData: `User requested password reset for email: ${email.toLowerCase()}`,
           component: 'auth',
           activityType: 'passwordreset'
        });
            res.status(200).json({ message: 'Password reset email sent' });
        } catch (error) {
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async resetPassword(req: Request, res: Response) {
        /**
         * Complete the password reset given a valid reset token.
         * - Hashes and stores the new password, clears reset tokens and logs the activity.
         * @param req Express request with `params.token` and `body.password`
         * @param res Express response
         */
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
             CreateActivity({
                user: user._id as mongoose.Types.ObjectId,
                eventData: `User reset their password: ${user.email}`,
                component: 'auth',
                activityType: 'passwordreset'
            });
            res.status(200).json({ message: 'Password has been reset' });
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    /**
     * Get platform-specific Google client ID for token verification.
     * @param platform Optional platform string ('android'|'ios'|undefined)
     * @returns Google client ID string for the given platform
     */
    getGoogleClientId(platform: string) {
    if (platform === 'android') return process.env.ANDROID_GOOGLE_LOGIN_CLIENT_ID;
    if (platform === 'ios') return process.env.IOS_GOOGLE_LOGIN_CLIENT_ID;
    return process.env.GOOGLE_LOGIN_CLIENT_ID; // web
    }


/**
 * Authenticate or register a user using Google OAuth.
 * - Verifies the Google ID token, optionally creates a new user on `signup` path,
 *   converts gifted streampasses/gifts and returns access/refresh tokens.
 * @param req Express request containing `googleauth`, `path`, optional `platform` and `token` in body
 * @param res Express response with tokens on success
 */
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
          isVerified: true,
          status: UserStatus.ACTIVE
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
    user.lastLogin = new Date();

    // Save user with session
    await user.save({ session });
     CreateActivity({
        user: user._id as mongoose.Types.ObjectId,
        eventData: `User sucessfully loggedin using google auth`,
        component: 'auth',
        activityType: 'login'
    });
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



/**
 * Authenticate or register a user using Apple sign-in token.
 * - Verifies the Apple ID token, optionally creates a new user on `signup` path,
 *   converts gifted streampasses/gifts and returns access/refresh tokens.
 * @param req Express request containing `id_token`, `path`, and optional `firstName`/`lastName` in body
 * @param res Express response with tokens on success
 */
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
          status: UserStatus.ACTIVE
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
    user.lastLogin = new Date();

    await user.save({ session });
    CreateActivity({
        user: user._id as mongoose.Types.ObjectId,
        eventData: `User sucessfully loggedin using apple auth`,
        component: 'auth',
        activityType: 'login'
    });
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
        /**
         * Log out the authenticated user by clearing stored refresh and session tokens.
         * @param req Express request containing authenticated `user.id`
         * @param res Express response
         */
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
        CreateActivity({
        user: user._id as mongoose.Types.ObjectId,
        eventData: `User sucessfully logged out`,
        component: 'auth',
        activityType: 'logout'
        });
        res.status(200).json({ message: 'User logged out successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async changePassword(req: Request, res: Response) {
        /**
         * Change the authenticated user's password.
         * - Verifies the current password before replacing it with a hashed new password.
         * @param req Express request with `user.id` and `oldPassword`, `newPassword` in body
         * @param res Express response
         */
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
            CreateActivity({
            user: user._id as mongoose.Types.ObjectId,
            eventData: `User changed their password sucessfully`,
            component: 'auth',
            activityType: 'changepassword'
            });

            res.status(200).json({ message: 'Password changed successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async deleteAccount(req: Request, res: Response) {
    /**
     * Soft-delete the authenticated user's account by setting `isDeleted`.
     * @param req Express request with authenticated `user.id`
     * @param res Express response
     */
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
        CreateActivity({
            user: user._id as mongoose.Types.ObjectId,
            eventData: `User deleted their account`,
            component: 'auth',
            activityType: 'deleteaccount'
            });
        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong. Please try again later' });
    }
}

/**
 * Convert gifts and streampasses associated with an email to the newly verified user.
 * - Marks matching gifts/streampasses as converted and assigns them to the provided userId within the provided session.
 * @param email Email address used for the gift/streampass
 * @param userId ID of the user to assign converted items to
 * @param session Mongoose session used for transactional updates
 * @returns Object containing counts of modified gifts and streampasses
 */
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
