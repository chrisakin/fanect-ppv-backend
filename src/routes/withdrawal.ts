import express from 'express';
import withdrawalController from '../controllers/withdrawalController';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

router.post('/details', authMiddleware, withdrawalController.saveWithdrawalDetails);
router.get('/details', authMiddleware, withdrawalController.getAllWithdrawalDetails);

export default router;