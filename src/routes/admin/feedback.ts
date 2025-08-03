import { Router } from "express";
import adminAuthMiddleware from "../../middleware/adminAuthMiddleware";
import feedbackController from "../../controllers/admin/feedbackController";


const router = Router();

router.get('/all-feedbacks', adminAuthMiddleware, feedbackController.getAllFeedbacks);
//router.get('/feedback-stats', adminAuthMiddleware, feedbackController.getFeedbackStats)
export default router;