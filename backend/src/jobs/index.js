import cron from 'node-cron';
import { runDailySnapshot, runHourlySnapshot, runCleanup } from './snapshotJobs.js';

export const initCronJobs = () => {
    // Daily snapshot — midnight every day
    cron.schedule('0 0 * * *', runDailySnapshot, {
        timezone: 'UTC'
    });

    // Hourly snapshot — every hour
    cron.schedule('0 * * * *', runHourlySnapshot, {
        timezone: 'UTC'
    });

    // Cleanup old snapshots — 1am every day
    cron.schedule('0 1 * * *', runCleanup, {
        timezone: 'UTC'
    });

    console.log('[CRON] All cron jobs initialized');
};