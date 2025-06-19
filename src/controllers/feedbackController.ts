import mongoose from 'mongoose';
import Feedback from '../models/Feedback';
import { Request, Response } from 'express';

class FeedbackController {
    async submitFeedback(req: Request, res: Response) {
        const userId = req.user.id;
        const { eventId, ratings, comment } = req.body;

        if (!eventId || !ratings) {
            return res.status(400).json({ message: 'Event and ratings are required' });
        }

        try {
            // Prevent duplicate feedback per user per event
            const existing = await Feedback.findOne({ user: userId, event: eventId });
            if (existing) {
                return res.status(400).json({ message: 'You have already submitted feedback for this event.' });
            }

            const feedback = await Feedback.create({
                user: userId,
                event: eventId,
                ratings,
                comment
            });

            res.status(201).json({ message: 'Feedback submitted', feedback });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }

    async getEventFeedback(req: Request, res: Response) {
        const { eventId } = req.params;
        try {
            const feedbacks = await Feedback.find({ event: eventId }).populate('user', 'firstName lastName');
            // Optionally, calculate average rating:
            const avg = await Feedback.aggregate([
                { $match: { event: new mongoose.Types.ObjectId(eventId) } },
                { $group: { _id: null, avgRating: { $avg: "$ratings" }, count: { $sum: 1 } } }
            ]);
            res.json({ feedbacks, average: avg[0]?.avgRating || 0, count: avg[0]?.count || 0 });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
}

export default new FeedbackController();