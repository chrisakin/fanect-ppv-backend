import * as cron from 'node-cron';
import SessionCleanupService from './sessionCleanupService';

/**
 * Service that manages scheduled cron jobs used by the application.
 *
 * This class is a singleton — call getInstance() or import the default
 * export to access the single shared instance.
 */
class CronService {
  private static instance: CronService;
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {}

  /**
   * Returns the singleton instance of CronService.
   * @returns {CronService} The shared CronService instance.
   */
  static getInstance(): CronService {
    if (!CronService.instance) {
      CronService.instance = new CronService();
    }
    return CronService.instance;
  }

  /** Schedules and starts the session cleanup cron job (runs every 5 minutes). */
  startSessionCleanup(): void {
    const jobName = 'session-cleanup';

    this.stopJob(jobName);
    const options: any = {
      scheduled: false,
      timezone: 'UTC',
    };
    const task = cron.schedule(
      '*/5 * * * *',
      async () => {
        try {
          console.log('🧹 Starting scheduled session cleanup...');
          await SessionCleanupService.cleanupStaleSessions(2);
          console.log('✅ Scheduled session cleanup completed');
        } catch (error) {
          console.error('❌ Error during scheduled session cleanup:', error);
        }
      },
      options
    );

    this.jobs.set(jobName, task);
    task.start();

    console.log('🚀 Session cleanup cron job started (runs every 5 minutes)');
  }

  /**
   * Starts all configured cron jobs. Currently this delegates to startSessionCleanup() but it centralizes startup for future jobs.
   */
  startAllJobs(): void {
    console.log('🔄 Starting all cron jobs...');
    this.startSessionCleanup();
  }

  /**
   * Stops and removes a scheduled job by name.
   * @param {string} jobName - The name of the cron job to stop.
   */
  stopJob(jobName: string): void {
    const job = this.jobs.get(jobName);
    if (job) {
      job.destroy();
      this.jobs.delete(jobName);
      console.log(`⏹️ Stopped cron job: ${jobName}`);
    }
  }

  /**
   * Stops and clears all scheduled cron jobs managed by this service.
   */
  stopAllJobs(): void {
    console.log('⏹️ Stopping all cron jobs...');
    for (const [jobName, job] of this.jobs) {
      job.destroy();
      console.log(`⏹️ Stopped cron job: ${jobName}`);
    }
    this.jobs.clear();
  }

  /**
   * Returns the status of each managed job.
   * @returns {{ [key: string]: string }} An object mapping job names to their status.
   */
  getJobsStatus(): { [key: string]: string } {
    const status: { [key: string]: string } | any = {};
    for (const [jobName, job] of this.jobs) {
      status[jobName] = job.getStatus();
    }
    return status;
  }

  /**
   * Triggers the session cleanup routine immediately. Useful for manual/one-off runs (for example from an admin action).
   * @returns {Promise<void>} Resolves when the cleanup completes.
   * @throws Will re-throw any error encountered by SessionCleanupService.cleanupStaleSessions.
   */
  async triggerSessionCleanup(): Promise<void> {
    try {
      console.log('🧹 Manual session cleanup triggered...');
      await SessionCleanupService.cleanupStaleSessions(2);
      console.log('✅ Manual session cleanup completed');
    } catch (error) {
      console.error('❌ Error during manual session cleanup:', error);
      throw error;
    }
  }
}

export default CronService.getInstance();
