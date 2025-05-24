import { Router } from 'express';
import EventController from '../controllers/eventController';
import authMiddleware from '../middleware/authMiddleware';
import { uploadFields } from '../middleware/multerMiddleware';

const router = Router();

router.post('/',  uploadFields, authMiddleware, EventController.createEvent);
router.get('/', authMiddleware, EventController.getEvents);
router.get('/upcoming', EventController.getUpcomingEvents);
router.get('/live', authMiddleware, EventController.getLiveEvents);
router.get('/past', authMiddleware, EventController.getPastEvents);
router.get('/:id', EventController.getEventById);
router.put('/:id',  uploadFields, authMiddleware, EventController.updateEvent);
router.delete('/:id', authMiddleware, EventController.deleteEvent);

export default router;