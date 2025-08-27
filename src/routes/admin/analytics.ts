import { Router } from "express";
import adminAuthMiddleware from "../../middleware/adminAuthMiddleware";
import analyticsController from '../../controllers/admin/analyticsController';
import SessionCleanupService from '../../services/sessionCleanupService';
import cronService from '../../services/cronService';
import { Request, Response } from 'express';

const router = Router();

// Main Analytics Endpoints
router.get('/dashboard', adminAuthMiddleware, analyticsController.getDashboardOverview);
router.get('/detailed', adminAuthMiddleware, analyticsController.getDetailedAnalytics);

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

// Get cron job status
router.get('/cron-status', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const status = cronService.getJobsStatus();
    res.status(200).json({
      message: 'Cron job status retrieved successfully',
      status
    });
  } catch (error) {
    console.error('Error getting cron status:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again later' });
  }
});

// Manual trigger for session cleanup
router.post('/trigger-cleanup', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    await cronService.triggerSessionCleanup();
    res.status(200).json({
      message: 'Session cleanup triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering cleanup:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again later' });
  }
});

export default router;