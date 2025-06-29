import { Router } from 'express';
import EventController from '../controllers/eventController';
import authMiddleware from '../middleware/authMiddleware';
import { uploadFields } from '../middleware/multerMiddleware';
import express from 'express';

const router = Router();

router.post('/',  uploadFields, authMiddleware, EventController.createEvent);
router.get('/', authMiddleware, EventController.getEvents);
router.get('/upcoming', EventController.getUpcomingEvents);
router.get('/auth/upcoming', authMiddleware, EventController.getUpcomingEvents);
router.get('/live', authMiddleware, EventController.getLiveEvents);
router.get('/past', authMiddleware, EventController.getPastEvents);
router.get('/auth/:id', authMiddleware, EventController.getEventById);
router.get('/:id',  EventController.getEventById);
router.put('/:id',  uploadFields, authMiddleware, EventController.updateEvent);
router.delete('/:id', authMiddleware, EventController.deleteEvent);
router.get('/stats/:eventId', authMiddleware, EventController.eventStatistics)
router.get('/streamkey/:eventId', authMiddleware, EventController.getStreamKeyForEvent)
router.get('/playbackurl/:eventId', authMiddleware, EventController.getPlaybackUrl)
router.get('/savedbroadcasturl/:eventId', authMiddleware, EventController.getSavedbroadcastUrl)
router.post('/ivs/webhook', express.text({ type: "*/*" }), EventController.ivsWebhook)
export default router;