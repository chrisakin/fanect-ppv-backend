import { Request, Response } from 'express';
import WithdrawalDetails from '../models/Withdrawal';
import { CreateActivity } from '../services/userActivityService';
import mongoose from 'mongoose';

/**
 * Controller for managing user withdrawal details.
 * - Allows users to save bank/withdrawal details and retrieve their saved details.
 */
class WithdrawalController {
    /**
     * Save withdrawal/bank details for the authenticated user.
     * - Validates required fields (`accountNumber`, `bankName`, `accountName`).
     * - Prevents duplicate withdrawal details for the same user.
     * - Persists a `WithdrawalDetails` document and records a user activity via `CreateActivity`.
     * @param req Express request. Requires `req.user.id` and `body` containing bank details.
     * @param res Express response. Returns 201 with the created withdrawal record on success, or 4xx/5xx on error.
     */
    async saveWithdrawalDetails(req: Request, res: Response) {
        const userId = req.user.id;
        const {
            accountNumber,
            bankName,
            bankType,
            accountName,
            currency,
            address,
            bankRoutingNumber,
        } = req.body;

        if (!accountNumber || !bankName || !accountName) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        try {
            // Check if withdrawal details for this user and currency already exist
            const existing = await WithdrawalDetails.findOne({ user: userId });
            if (existing) {
                return res.status(400).json({ message: 'Withdrawal details for this currency already exist. Please contact admin to update this account.' });
            }

            const withdrawal = await WithdrawalDetails.create({
                user: userId,
                accountNumber,
                bankName,
                bankType,
                accountName,
                currency,
                address,
                bankRoutingNumber,
            });
            CreateActivity({
            user: req.user.id as unknown as mongoose.Types.ObjectId,
            eventData: `Saved withdrawal details for user ${userId}`,
            component: 'withdrawal',
            activityType: 'withdrawalDetails'
            });
            res.status(201).json({ message: 'Withdrawal details saved', withdrawal });
        } catch (error) {
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    /**
     * Retrieve the authenticated user's withdrawal details.
     * - Returns the most recent withdrawal details entry for the user, if any.
     * @param req Express request. Requires `req.user.id`.
     * @param res Express response. Returns 200 with the withdrawal details or 5xx on error.
     */
    async getAllWithdrawalDetails(req: Request, res: Response) {
        const userId = req.user.id;
        try {
            const withdrawals = await WithdrawalDetails.find({ user: userId }).sort({createdAt: -1});
            res.status(200).json({ message: 'Withdrawal details gotten', withdrawals: withdrawals[0] });
        } catch (error) {
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }
}

export default new WithdrawalController();