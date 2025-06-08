import { Request, Response } from 'express';
import WithdrawalDetails from '../models/Withdrawal';

class WithdrawalController {
    async saveWithdrawalDetails(req: Request, res: Response) {
        const userId = req.user.id;
        const {
            accountNumber,
            bankName,
            sortCode,
            accountName,
            currency,
            country,
            routingNumber,
            accountType
        } = req.body;

        if (!accountNumber || !bankName || !accountName || !currency || !country) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        try {
            // Check if withdrawal details for this user and currency already exist
            const existing = await WithdrawalDetails.findOne({ user: userId, currency });
            if (existing) {
                return res.status(400).json({ message: 'Withdrawal details for this currency already exist. Please contact admin to update this currency.' });
            }

            const withdrawal = await WithdrawalDetails.create({
                user: userId,
                accountNumber,
                bankName,
                sortCode,
                accountName,
                currency,
                country,
                routingNumber,
                accountType
            });

            res.status(201).json({ message: 'Withdrawal details saved', withdrawal });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }

    async getAllWithdrawalDetails(req: Request, res: Response) {
        const userId = req.user.id;
        try {
            const withdrawals = await WithdrawalDetails.find({ user: userId });
            res.status(200).json({ withdrawals });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
}

export default new WithdrawalController();