import express from 'express';
import StreampassController from '../controllers/streampassController';
import authMiddleware from '../middleware/authMiddleware';


const router = express.Router();

router.post('/buy-streampass', authMiddleware, StreampassController.buyStreampass);

export default router;