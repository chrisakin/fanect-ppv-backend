import mongoose from 'mongoose';
import Feedback from '../models/Feedback';
import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import { CreateActivity } from '../services/userActivityService';

/**
 * Controller for submitting and retrieving event feedback.
 * - Handles preventing duplicate submissions, persisting feedback, and computing summary statistics.
 */
class FeedbackController {
    /**
     * Submit feedback for an event from the authenticated user.
     * - Validates required fields (`eventId`, `ratings`).
     * - Prevents duplicate feedback from the same user for the same event.
     * - Persists a `Feedback` document and records a user activity via `CreateActivity`.
     * @param req Express request. Requires `req.user.id` and `body` containing `eventId`, `ratings`, and optional `comments`.
     * @param res Express response. Returns 201 with the created feedback on success, or 4xx/5xx on error.
     */
    async submitFeedback(req: Request, res: Response) {
        const userId = req.user.id;
        const { eventId, ratings, comments } = req.body;

        if (!eventId || !ratings) {
            return res.status(400).json({ message: 'Event and ratings are required' });
        }

        try {
            // Prevent duplicate feedback per user per event
            const existing = await Feedback.findOne({ user: userId, event: eventId });
            if (existing) {
                return res.status(400).json({ message: 'You have already submitted feedback for this event.' });
            }
            const userName = (await User.findById(userId) as IUser).firstName
            const feedback = await Feedback.create({
                user: userId,
                userName,
                event: eventId,
                ratings,
                comments
            });
            CreateActivity({
                user: userId as unknown as mongoose.Types.ObjectId,
                eventData: `User submitted feedback for event with ID ${eventId}`,
                component: 'feedback',
                activityType: 'feedback'
                });

            res.status(201).json({ message: 'Feedback submitted', feedback });
        } catch (error) {
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    /**
     * Retrieve all feedback for a specified event and compute summary statistics.
     * - Populates the `user` field with the user's `firstName` and `lastName`.
     * - Returns an aggregated average rating and total count alongside the list of feedbacks.
     * @param req Express request. Expects `params.eventId` to identify the event.
     * @param res Express response. Returns an object with `feedbacks`, `average`, and `count`, or a 5xx on error.
     */
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
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }
}

export default new FeedbackController();