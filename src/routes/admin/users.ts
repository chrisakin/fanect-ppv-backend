import { Router } from "express";
import adminAuthMiddleware from "../../middleware/adminAuthMiddleware";
import UserController from '../../controllers/admin/usersController';

const router = Router();

// router.post('/create', adminAuthMiddleware, UserController.createUser);
// router.put('/update/:id', adminAuthMiddleware, UserController.updateUser);
// router.delete('/delete/:id', adminAuthMiddleware, UserController.deleteUser);
router.get('/all-users', adminAuthMiddleware, UserController.getAllUsers);
router.get('/single-user/:id', adminAuthMiddleware, UserController.getUserById);
router.post('/lock-user/:id', adminAuthMiddleware, UserController.lockUser);
router.post('/unlock-user/:id', adminAuthMiddleware, UserController.unlockUser);
router.get('/single-user-events/:id', adminAuthMiddleware, UserController.getEventsJoinedByUser);
router.get('/single-user-activities/:id', adminAuthMiddleware, UserController.getUserActivities);
router.get('/single-user-transactions/:id', adminAuthMiddleware, UserController.getUsersTransactionHistory);
export default router;