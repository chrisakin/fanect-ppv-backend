import { Router } from "express";
import adminAuthMiddleware from "../../middleware/adminAuthMiddleware";
import OrganiserController from '../../controllers/admin/organisersController';

const router = Router();

router.get('/all-organisers', adminAuthMiddleware, OrganiserController.getAllOrganisers);
router.get('/single-organiser-events/:id', adminAuthMiddleware, OrganiserController.getEventsCreatedByOrganiser);

export default router;