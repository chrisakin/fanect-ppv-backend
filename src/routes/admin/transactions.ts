import { Router } from "express";
import adminAuthMiddleware from "../../middleware/adminAuthMiddleware";
import TransactionsController from "../../controllers/admin/transactionsController"


const router = Router();

router.get('/all-transactions', adminAuthMiddleware, TransactionsController.getAllTransactions);
router.get('/transaction-stats', adminAuthMiddleware, TransactionsController.getTransactionStats)
export default router;