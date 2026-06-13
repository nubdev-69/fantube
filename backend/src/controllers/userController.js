// controllers/userController.js
import { query } from '../database/config/database.js';

export default class UserController {

    static async getHistory(req, res, next) {
        try {
            const userId = req.userId;
            const result = await query(
                `SELECT DISTINCT ON (v.id)
                    v.video_id,
                    v.title,
                    v.thumbnail,
                    v.views,
                    v.published_at,
                    c.name      AS channel,
                    u.pfp,
                    u.user_id   AS handle,
                    vm.duration,
                    wh.watched_at,
                    wh.watch_duration,
                    wh.completed
                 FROM watch_history wh
                 JOIN videos v      ON v.id = wh.video_id
                 JOIN channels c    ON c.id = v.channel_id
                 JOIN users u       ON u.id = v.created_by
                 JOIN video_meta vm ON vm.video_id = v.id
                 WHERE wh.user_id = $1
                   AND v.visibility = 'public'
                 ORDER BY v.id, wh.watched_at DESC`,
                [userId]
            );

            // sort by most recently watched
            const sorted = result.rows.sort(
                (a, b) => new Date(b.watched_at) - new Date(a.watched_at)
            );

            res.json({
                history: sorted.map(row => ({
                    videoId: row.video_id,
                    title: row.title,
                    thumbnail: row.thumbnail,
                    views: row.views || 0,
                    publishedAt: row.published_at,
                    channel: row.channel,
                    pfp: row.pfp,
                    handle: row.handle,
                    duration: row.duration || 0,
                    watchedAt: row.watched_at,
                    watchDuration: row.watch_duration,
                    completed: row.completed
                }))
            });
        } catch (error) {
            next(error);
        }
    }

    static async clearHistory(req, res, next) {
        try {
            await query(
                'DELETE FROM watch_history WHERE user_id = $1',
                [req.userId]
            );
            res.json({ message: 'Watch history cleared' });
        } catch (error) {
            next(error);
        }
    }

    static async getPlaylists(req, res, next) {
        try {
            const userId = req.userId;
            const result = await query(
                `SELECT
                    p.id,
                    p.name,
                    p.description,
                    p.visibility,
                    p.created_at,
                    COUNT(pv.id) AS video_count,
                    (
                        SELECT v2.thumbnail
                        FROM playlist_videos pv2
                        JOIN videos v2 ON v2.id = pv2.video_id
                        WHERE pv2.playlist_id = p.id
                        ORDER BY pv2.position ASC
                        LIMIT 1
                    ) AS cover
                 FROM playlists p
                 LEFT JOIN playlist_videos pv ON pv.playlist_id = p.id
                 WHERE p.user_id = $1
                 GROUP BY p.id
                 ORDER BY
                    CASE WHEN p.name = 'Liked Videos'  THEN 0
                         WHEN p.name = 'Watch Later'   THEN 1
                         ELSE 2
                    END,
                    p.created_at DESC`,
                [userId]
            );

            res.json({
                playlists: result.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    visibility: row.visibility,
                    videoCount: parseInt(row.video_count) || 0,
                    cover: row.cover || null,
                    createdAt: row.created_at,
                    isDefault: ['Liked Videos', 'Watch Later'].includes(row.name)
                }))
            });
        } catch (error) {
            next(error);
        }
    }

    static async getLikedVideos(req, res, next) {
        try {
            const userId = req.userId;
            const result = await query(
                `SELECT
                    v.video_id,
                    v.title,
                    v.thumbnail,
                    v.views,
                    v.published_at,
                    c.name      AS channel,
                    u.pfp,
                    u.user_id   AS handle,
                    vm.duration,
                    i.created_at AS liked_at
                 FROM interactions i
                 JOIN videos v      ON v.id = i.video_id
                 JOIN channels c    ON c.id = v.channel_id
                 JOIN users u       ON u.id = v.created_by
                 JOIN video_meta vm ON vm.video_id = v.id
                 WHERE i.user_id = $1
                   AND i.interaction_type = 'like'
                   AND v.visibility = 'public'
                 ORDER BY i.created_at DESC`,
                [userId]
            );

            res.json({
                videos: result.rows.map(row => ({
                    videoId: row.video_id,
                    title: row.title,
                    thumbnail: row.thumbnail,
                    views: row.views || 0,
                    publishedAt: row.published_at,
                    channel: row.channel,
                    pfp: row.pfp,
                    handle: row.handle,
                    duration: row.duration || 0,
                    likedAt: row.liked_at
                }))
            });
        } catch (error) {
            next(error);
        }
    }

    // subscriptionController.js

    static async getSubscriptions(req, res, next) {
        try {
            const userId = req.userId;

            const result = await query(
                `SELECT
                    c.id,
                    c.name,
                    c.banner,
                    c.subs_count,
                    c.video_count,
                    u.pfp,
                    u.user_id AS handle,
                    -- latest video
                    (
                        SELECT v.video_id FROM videos v
                        WHERE v.channel_id = c.id
                          AND v.visibility = 'public'
                        ORDER BY v.published_at DESC
                        LIMIT 1
                    ) AS latest_video_id,
                    (
                        SELECT v.thumbnail FROM videos v
                        WHERE v.channel_id = c.id
                          AND v.visibility = 'public'
                        ORDER BY v.published_at DESC
                        LIMIT 1
                    ) AS latest_thumbnail,
                    (
                        SELECT v.title FROM videos v
                        WHERE v.channel_id = c.id
                          AND v.visibility = 'public'
                        ORDER BY v.published_at DESC
                        LIMIT 1
                    ) AS latest_title,
                    (
                        SELECT v.published_at FROM videos v
                        WHERE v.channel_id = c.id
                          AND v.visibility = 'public'
                        ORDER BY v.published_at DESC
                        LIMIT 1
                    ) AS latest_published_at
                 FROM subscriptions s
                 JOIN channels c ON c.id = s.channel_id
                 JOIN users u    ON u.id = c.user_id
                 WHERE s.user_id = $1
                 ORDER BY c.name ASC`,
                [userId]
            );

            res.json({
                subscriptions: result.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    handle: row.handle,
                    pfp: row.pfp,
                    banner: row.banner,
                    subsCount: row.subs_count,
                    videoCount: row.video_count,
                    latestVideo: row.latest_video_id ? {
                        videoId: row.latest_video_id,
                        thumbnail: row.latest_thumbnail,
                        title: row.latest_title,
                        publishedAt: row.latest_published_at
                    } : null
                }))
            });
        } catch (error) {
            next(error);
        }
    }

    // get latest videos from all subscribed channels
    static async getSubscriptionFeed(req, res, next) {
        try {
            const userId = req.userId;
            const { page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            const result = await query(
                `SELECT
                    v.video_id,
                    v.title,
                    v.thumbnail,
                    v.views,
                    v.published_at,
                    c.name      AS channel,
                    c.id        AS channel_id,
                    u.pfp,
                    u.user_id   AS handle,
                    vm.duration
                 FROM subscriptions s
                 JOIN channels c    ON c.id = s.channel_id
                 JOIN videos v      ON v.channel_id = c.id
                 JOIN users u       ON u.id = c.user_id
                 JOIN video_meta vm ON vm.video_id = v.id
                 WHERE s.user_id = $1
                   AND v.visibility = 'public'
                 ORDER BY v.published_at DESC
                 LIMIT $2 OFFSET $3`,
                [userId, limit, offset]
            );

            res.json({
                videos: result.rows.map(row => ({
                    videoId: row.video_id,
                    title: row.title,
                    thumbnail: row.thumbnail,
                    views: row.views || 0,
                    publishedAt: row.published_at,
                    channel: row.channel,
                    channelId: row.channel_id,
                    pfp: row.pfp,
                    handle: row.handle,
                    duration: row.duration || 0
                }))
            });
        } catch (error) {
            next(error);
        }
    }
}