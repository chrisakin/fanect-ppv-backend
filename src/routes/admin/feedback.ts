import { Router } from "express";
import adminAuthMiddleware from "../../middleware/adminAuthMiddleware";
import feedbackController from "../../controllers/admin/feedbackController";


const router = Router();

router.get('/all-feedbacks', adminAuthMiddleware, feedbackController.getAllFeedbacks);
router.get('/all-feedbacks/:id', adminAuthMiddleware, feedbackController.getAllFeedbacks);

export default router;