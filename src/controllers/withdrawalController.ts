import { Request, Response } from 'express';
import WithdrawalDetails from '../models/Withdrawal';
import { CreateActivity } from '../services/userActivityService';
import mongoose from 'mongoose';

class WithdrawalController {
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