import { Router } from "express";
import adminAuthMiddleware from "../../middleware/adminAuthMiddleware";
import EventController from '../../controllers/admin/eventController';

const router = Router();

router.put('/publish/:id', adminAuthMiddleware, EventController.publishEvent);
router.put('/unpublish/:id', adminAuthMiddleware, EventController.unpublishEvent);

export default router;