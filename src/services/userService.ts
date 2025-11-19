import Admin from "../models/Admin";
import User from "../models/User";
import { Response } from "express";

/**
 * Retrieves a user by ID, excluding sensitive fields.
 * @param {string} userId - The user's ID.
 * @param {Response} res - Express response object (for error handling).
 * @returns {Promise<any>} The user document or sends error response.
 */
export async function getOneUser(userId: string, res: Response) {
  try {
    const user = await User.findById(userId).select('-password -verificationCode -verificationCodeExpires -refreshToken -resetPasswordToken -resetPasswordExpires');
    return user
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong. Please try again later' });
    }
}

/**
 * Retrieves an admin by ID, excluding sensitive fields.
 * @param {string} userId - The admin's ID.
 * @param {Response} res - Express response object (for error handling).
 * @returns {Promise<any>} The admin document or sends error response.
 */
export async function getOneAdmin(userId: string, res: Response) {
  try {
    const user = await Admin.findById(userId).select('-password -verificationCode -verificationCodeExpires -refreshToken -resetPasswordToken -resetPasswordExpires');
    return user
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong. Please try again later' });
    }
}