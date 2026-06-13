import { query } from '../database/config/database.js';

export const runDailySnapshot = async () => {
    console.log(`[CRON] Daily snapshot started at ${new Date().toISOString()}`);
    try {
        const result = await query(`
            INSERT INTO video_snapshots 
                (video_id, views, likes, dislikes, saves, comments, period, snapshot_at)
            SELECT 
                v.id,

                (SELECT COUNT(*) FROM watch_history wh
                 WHERE wh.video_id = v.id
                 AND wh.watched_at >= DATE_TRUNC('day', NOW())
                 AND wh.watched_at <  DATE_TRUNC('day', NOW()) + INTERVAL '1 day'),

                (SELECT COUNT(*) FROM interactions i
                 WHERE i.video_id = v.id AND i.interaction_type = 'like'
                 AND i.created_at >= DATE_TRUNC('day', NOW())),

                (SELECT COUNT(*) FROM interactions i
                 WHERE i.video_id = v.id AND i.interaction_type = 'dislike'
                 AND i.created_at >= DATE_TRUNC('day', NOW())),

                (SELECT COUNT(*) FROM interactions i
                 WHERE i.video_id = v.id AND i.interaction_type = 'save'
                 AND i.created_at >= DATE_TRUNC('day', NOW())),

                (SELECT COUNT(*) FROM comments c
                 WHERE c.video_id = v.id
                 AND c.published_at >= DATE_TRUNC('day', NOW())),

                'daily',
                DATE_TRUNC('day', NOW())   -- consistent timestamp, no duplicates

            FROM videos v
            WHERE v.visibility = 'public'

            ON CONFLICT (video_id, snapshot_at, period) DO UPDATE SET
                views    = EXCLUDED.views,
                likes    = EXCLUDED.likes,
                dislikes = EXCLUDED.dislikes,
                saves    = EXCLUDED.saves,
                comments = EXCLUDED.comments;
        `);

        console.log(`[CRON] Daily snapshot done — ${result.rowCount} videos snapshotted`);
    } catch (err) {
        console.error('[CRON] Daily snapshot FAILED:', err.message);
    }
};

export const runHourlySnapshot = async () => {
    console.log(`[CRON] Hourly snapshot started at ${new Date().toISOString()}`);
    try {
        const result = await query(`
            INSERT INTO video_snapshots 
                (video_id, views, likes, dislikes, saves, comments, period, snapshot_at)
            SELECT 
                v.id,

                (SELECT COUNT(*) FROM watch_history wh
                 WHERE wh.video_id = v.id
                 AND wh.watched_at >= DATE_TRUNC('hour', NOW())
                 AND wh.watched_at <  DATE_TRUNC('hour', NOW()) + INTERVAL '1 hour'),

                (SELECT COUNT(*) FROM interactions i
                 WHERE i.video_id = v.id AND i.interaction_type = 'like'
                 AND i.created_at >= DATE_TRUNC('hour', NOW())),

                (SELECT COUNT(*) FROM interactions i
                 WHERE i.video_id = v.id AND i.interaction_type = 'dislike'
                 AND i.created_at >= DATE_TRUNC('hour', NOW())),

                (SELECT COUNT(*) FROM interactions i
                 WHERE i.video_id = v.id AND i.interaction_type = 'save'
                 AND i.created_at >= DATE_TRUNC('hour', NOW())),

                (SELECT COUNT(*) FROM comments c
                 WHERE c.video_id = v.id
                 AND c.published_at >= DATE_TRUNC('hour', NOW())),

                'hourly',
                DATE_TRUNC('hour', NOW())  -- consistent timestamp, no duplicates

            FROM videos v
            WHERE v.visibility = 'public'
            -- Only snapshot recent videos for hourly (saves DB load)
            AND v.published_at >= NOW() - INTERVAL '7 days'

            ON CONFLICT (video_id, snapshot_at, period) DO UPDATE SET
                views    = EXCLUDED.views,
                likes    = EXCLUDED.likes,
                dislikes = EXCLUDED.dislikes,
                saves    = EXCLUDED.saves,
                comments = EXCLUDED.comments;
        `);

        console.log(`[CRON] Hourly snapshot done — ${result.rowCount} videos snapshotted`);
    } catch (err) {
        console.error('[CRON] Hourly snapshot FAILED:', err.message);
    }
};

export const runCleanup = async () => {
    console.log(`[CRON] Cleanup started at ${new Date().toISOString()}`);
    try {
        await query(`
            DELETE FROM video_snapshots
            WHERE (period = 'hourly' AND snapshot_at < NOW() - INTERVAL '7 days')
               OR (period = 'daily'  AND snapshot_at < NOW() - INTERVAL '1 year');
        `);
        console.log('[CRON] Cleanup done');
    } catch (err) {
        console.error('[CRON] Cleanup FAILED:', err.message);
    }
};