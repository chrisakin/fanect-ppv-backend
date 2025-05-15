import { Router } from 'express';
import EventController from '../controllers/eventController';
import authMiddleware from '../middleware/authMiddleware';
import { uploadFields } from '../middleware/multerMiddleware';

const router = Router();

router.post('/',  uploadFields, authMiddleware, EventController.createEvent);
router.get('/', authMiddleware, EventController.getEvents);
router.get('/:id', authMiddleware, EventController.getEventById);
router.put('/:id',  uploadFields, authMiddleware, EventController.updateEvent);
router.delete('/:id', authMiddleware, EventController.deleteEvent);
router.get('/upcoming', authMiddleware, EventController.getUpcomingEvents);

export default router;