import * as cron from 'node-cron';
import SessionCleanupService from './sessionCleanupService';

class CronService {
  private static instance: CronService;
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  private constructor() {}

  static getInstance(): CronService {
    if (!CronService.instance) {
      CronService.instance = new CronService();
    }
    return CronService.instance;
  }

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

  startAllJobs(): void {
    console.log('🔄 Starting all cron jobs...');
    this.startSessionCleanup();
  }

  stopJob(jobName: string): void {
    const job = this.jobs.get(jobName);
    if (job) {
      job.destroy();
      this.jobs.delete(jobName);
      console.log(`⏹️ Stopped cron job: ${jobName}`);
    }
  }

  stopAllJobs(): void {
    console.log('⏹️ Stopping all cron jobs...');
    for (const [jobName, job] of this.jobs) {
      job.destroy();
      console.log(`⏹️ Stopped cron job: ${jobName}`);
    }
    this.jobs.clear();
  }

  getJobsStatus(): { [key: string]: string } {
    const status: { [key: string]: string } | any = {};
    for (const [jobName, job] of this.jobs) {
      status[jobName] = job.getStatus();
    }
    return status;
  }

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
