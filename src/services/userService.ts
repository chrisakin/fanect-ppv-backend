import User from "../models/User";
import { Response } from "express";

export async function getOneUser(userId: string, res: Response) {
  try {
    const user = await User.findById(userId).select('-password -verificationCode -verificationCodeExpires -refreshToken -resetPasswordToken -resetPasswordExpires');
    return user
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
}