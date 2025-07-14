import { Router } from "express";
import adminAuthMiddleware from "../../middleware/adminAuthMiddleware";
import EventController from '../../controllers/admin/eventController';

const router = Router();

router.put('/publish/:id', adminAuthMiddleware, EventController.publishEvent);
router.put('/unpublish/:id', adminAuthMiddleware, EventController.unpublishEvent);
router.put('/reject/:id', adminAuthMiddleware, EventController.rejectEvent);
router.put('/update-event-session/:id', adminAuthMiddleware, EventController.updateEventSession);
router.get('/all-events', adminAuthMiddleware, EventController.getAllEvents);
router.get('/single-event/:id', adminAuthMiddleware, EventController.getEventById)

export default router;