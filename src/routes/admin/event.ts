import { Router } from "express";
import adminAuthMiddleware from "../../middleware/adminAuthMiddleware";
import EventController from '../../controllers/admin/eventController';
import { uploadFields } from "../../middleware/multerMiddleware";

const router = Router();

router.post('/create',  uploadFields, adminAuthMiddleware, EventController.createEvent);
router.put('/update/:id',  uploadFields, adminAuthMiddleware, EventController.updateEvent);
router.post('/update-event-locations/:id', adminAuthMiddleware, EventController.updateEventLocations)
router.delete('/delete-event-location/:id', adminAuthMiddleware, EventController.removeEventLocations)
router.get('/event-locations/:id', adminAuthMiddleware, EventController.getEventLocations)
router.put('/publish/:id', adminAuthMiddleware, EventController.approveEvent);
router.put('/publish-unpublished-event/:id', adminAuthMiddleware, EventController.publishEvent);
router.put('/unpublish/:id', adminAuthMiddleware, EventController.unpublishEvent);
router.put('/reject/:id', adminAuthMiddleware, EventController.rejectEvent);
router.put('/update-event-session/:id', adminAuthMiddleware, EventController.updateEventSession);
router.get('/all-events', adminAuthMiddleware, EventController.getAllEvents);
router.get('/single-event/:id', adminAuthMiddleware, EventController.getEventById)
router.get('/single-event-metrics/:id', adminAuthMiddleware, EventController.getSingleEventMetrics)
router.get('/single-event-transactions/:id', adminAuthMiddleware, EventController.getSingleEventTransactions)
router.put('/toggle-save-stream/:id', adminAuthMiddleware, EventController.toggleSaveStream);
router.get('/revenue-report/:id', adminAuthMiddleware, EventController.getRevenueReport);
router.delete('/delete/:id', adminAuthMiddleware, EventController.deleteEvent);
export default router;