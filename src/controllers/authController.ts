import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import EmailService from '../services/emailService';
import { OAuth2Client } from 'google-auth-library';

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
    }

    async register(req: Request, res: Response) {
        const { email, password, firstName, lastName } = req.body;

        try {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }
            const username = email.split('@')[0]; // Use part of the email as username
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
                { code: verificationCode }
            );

            res.status(201).json({ message: 'Verification code sent to your email' });
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: 'Server error' });
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
                { code: verificationCode }
            );
    
            res.status(200).json({ message: 'Verification code resent to your email' });
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: 'Server error' });
        }
    }

    async verifyEmail(req: Request, res: Response) {
        const { email, code } = req.body;

        try {
            const user = await User.findOne({ email });

            if (!user) {
                return res.status(400).json({ message: 'User not found' });
            }

            if (user.isVerified) {
                return res.status(400).json({ message: 'User is already verified' });
            }

            if (user.verificationCode !== code || (user.verificationCodeExpires ?? 0) < Date.now()) {
                return res.status(400).json({ message: 'Invalid or expired verification code' });
            }

            user.isVerified = true;
            user.verificationCode = undefined;
            user.verificationCodeExpires = undefined;

            const accessToken = this.generateAccessToken(user._id);
            const refreshToken = this.generateRefreshToken(user._id);

            user.refreshToken = refreshToken;
            await user.save();

            res.status(200).json({ message: 'Email verified successfully', data: { accessToken, refreshToken } });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }

     private generateAccessToken(userId: string): string {
        return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    }

     private generateRefreshToken(userId: string): string {
        return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || 'refresh_secret', { expiresIn: '7d' });
    }

    
    async login(req: Request, res: Response) {
        const { email, password } = req.body;

        try {
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
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
                'Resend Email Verification',
                'emailVerification',
                { code: verificationCode }
            );
            return res.status(400).json({ message: 'User is not verified' });
            }

            const accessToken = this.generateAccessToken(user._id);
            const refreshToken = this.generateRefreshToken(user._id);

            // Optionally store the refresh token in the database
            user.refreshToken = refreshToken;
            await user.save();

            res.status(201).json({ message: 'User logged in successfully', data: { accessToken, refreshToken } });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }

    async refreshToken(req: Request, res: Response) {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token is required' });
        }

        try {
            const decoded: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh_secret');
            const user = await User.findById(decoded.id);

            if (!user || user.refreshToken !== refreshToken) {
                return res.status(403).json({ message: 'Invalid refresh token' });
            }

            const newAccessToken = this.generateAccessToken(user._id);
            res.json({ accessToken: newAccessToken });
        } catch (error) {
            res.status(403).json({ message: 'Invalid or expired refresh token' });
        }
    }

    async getProfile(req: Request, res: Response) {
        const userId = req.user.id;
        try {
            const user = await User.findById(userId).select('-password -verificationCode -verificationCodeExpires -refreshToken -resetPasswordToken -resetPasswordExpires');
            console.log(user)
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(user);
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: 'Server error' });
        }
    }

    async forgotPassword(req: Request, res: Response) {
        const { email } = req.body;

        try {
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(400).json({ message: 'User not found' });
            }

            const resetToken = crypto.randomBytes(20).toString('hex');
            user.resetPasswordToken = resetToken;
            user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
            await user.save();

            const resetUrl = `http://${req.headers.host}/reset/${resetToken}`;
            await EmailService.sendEmail(
                user.email,
                'Password Reset',
                'passwordReset',
                { resetUrl }
            );

            res.status(200).json({ message: 'Password reset email sent' });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
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

            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            res.status(200).json({ message: 'Password has been reset' });
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: 'Server error' });
        }
    }

    async googleAuth(req: Request, res: Response) {
        const { googleauth, path, token } = req.body;
        try {
           // Verify the Google token
            const ticket = await client.verifyIdToken({
                idToken: googleauth.id_token,
                audience: process.env.GOOGLE_LOGIN_CLIENT_ID,
            });

            const payload = ticket.getPayload();
            if (!payload) {
                return res.status(400).json({ message: 'Invalid Google token' });
            }

            const { email, given_name: firstName, family_name: lastName } = payload;

            // Check if the user already exists
            let user = await User.findOne({ email });
            if(!user) {
                if (path === 'register') {
                    // Create a new user if not found
                    user = new User({
                        username: email?.split('@')[0],
                        email,
                        firstName,
                        lastName,
                        isVerified: true, // Google accounts are already verified
                    });
                    
                } else {
                 return res.status(400).json({ message: 'User not found, go and signup for an account' });
                }
            }
            
            if(user && user.isVerified === false) {
                user.isVerified = true;
                user.verificationCode = undefined;
                user.verificationCodeExpires = undefined;
            }
            // Generate JWT tokens
            console.log(user._id)
            const accessToken = this.generateAccessToken(user._id);
            const refreshToken = this.generateRefreshToken(user._id);

            // Optionally store the refresh token in the database
            user.refreshToken = refreshToken;
            await user.save();

            res.status(200).json({ message: 'Google login successful', data: { accessToken, refreshToken } });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    async logout(req: Request, res: Response) {
        const userId = req.user.id;
        try {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            user.refreshToken = undefined;
            await user.save();

            res.status(200).json({ message: 'User logged out successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
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

            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Old password is incorrect' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            await user.save();

            res.status(200).json({ message: 'Password changed successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
}

export default new AuthController();