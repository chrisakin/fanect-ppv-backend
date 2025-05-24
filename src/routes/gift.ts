import express from 'express';
import GiftController from '../controllers/giftController';
import authMiddleware from '../middleware/authMiddleware';


const router = express.Router();

router.post('/gift-streampass', authMiddleware, GiftController.giftStreampass);

export default router;