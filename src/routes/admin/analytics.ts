import { Router } from "express";
import adminAuthMiddleware from "../../middleware/adminAuthMiddleware";
import { Request, Response } from 'express';
import SessionCleanupService from '../../services/sessionCleanupService';

const router = Router();

// Get session statistics for admin dashboard
router.get('/session-stats', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = await SessionCleanupService.getActiveSessionStats();
    res.status(200).json({
      message: 'Session statistics retrieved successfully',
      stats
    });
  } catch (error) {
    console.error('Error getting session stats:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again later' });
  }
});

// Manual cleanup endpoint for admin
router.post('/cleanup-sessions', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { staleThresholdMinutes } = req.body;
    await SessionCleanupService.cleanupStaleSessions(staleThresholdMinutes);
    res.status(200).json({
      message: 'Session cleanup completed successfully'
    });
  } catch (error) {
    console.error('Error during manual cleanup:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again later' });
  }
});

export default router;