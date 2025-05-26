import express from 'express';
import StreampassController from '../controllers/streampassController';
import authMiddleware from '../middleware/authMiddleware';
import streampassController from '../controllers/streampassController';


const router = express.Router();

router.post('/buy-streampass', authMiddleware, StreampassController.buyStreampass);
router.get('/upcoming', authMiddleware, StreampassController.getUpcomingTicketedEvents);
router.get('/past', authMiddleware, StreampassController.getPastTicketedEvents);
router.get('/live', authMiddleware, StreampassController.getLiveTicketedEvents);
router.post('/payments/stripe/create-checkout-session', authMiddleware, streampassController.createStripeCheckoutSession)

export default router;