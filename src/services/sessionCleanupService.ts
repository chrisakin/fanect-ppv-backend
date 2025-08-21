import Streampass from '../models/Streampass';

/**
 * Cleanup service to remove stale streaming sessions
 * This should be called periodically (e.g., every 5-10 minutes) via a cron job
 */
export class SessionCleanupService {
  /**
   * Clean up stale streaming sessions
   * Sessions are considered stale if they haven't been active for more than the specified duration
   * @param staleThresholdMinutes - Minutes after which a session is considered stale (default: 2 minutes)
   */
  static async cleanupStaleSessions(staleThresholdMinutes: number = 2): Promise<void> {
    try {
      const staleThreshold = new Date(Date.now() - staleThresholdMinutes * 60 * 1000);
      
      const result = await Streampass.updateMany(
        {
          inSession: true,
          $or: [
            { lastActive: { $lt: staleThreshold } },
            { lastActive: { $exists: false } }
          ]
        },
        {
          $set: {
            inSession: false
          },
          $unset: {
            sessionToken: 1,
            lastActive: 1
          }
        }
      );

      console.log(`Cleaned up ${result.modifiedCount} stale streaming sessions`);
    } catch (error) {
      console.error('Error cleaning up stale sessions:', error);
    }
  }

  /**
   * Get statistics about active sessions
   */
  static async getActiveSessionStats(): Promise<{
    totalActiveSessions: number;
    recentlyActiveSessions: number;
    staleSessions: number;
  }> {
    try {
      const activeThreshold = new Date(Date.now() - 30 * 1000); // 30 seconds
      const staleThreshold = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes

      const [totalActive, recentlyActive, stale] = await Promise.all([
        Streampass.countDocuments({ inSession: true }),
        Streampass.countDocuments({ 
          inSession: true, 
          lastActive: { $gte: activeThreshold } 
        }),
        Streampass.countDocuments({ 
          inSession: true,
          $or: [
            { lastActive: { $lt: staleThreshold } },
            { lastActive: { $exists: false } }
          ]
        })
      ]);

      return {
        totalActiveSessions: totalActive,
        recentlyActiveSessions: recentlyActive,
        staleSessions: stale
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return {
        totalActiveSessions: 0,
        recentlyActiveSessions: 0,
        staleSessions: 0
      };
    }
  }
}

export default SessionCleanupService;