import express from 'express';
import feedbackController from '../controllers/feedbackController';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', authMiddleware, feedbackController.submitFeedback);
router.get('/event/:eventId', feedbackController.getEventFeedback);

export default router;