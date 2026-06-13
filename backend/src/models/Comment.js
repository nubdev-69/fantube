import { query } from '../database/config/database.js';
import VideoModel from './Video.js';

class CommentModel {

    static async addComment({ userId, videoId, replyId, text }) {
        const video_id = await VideoModel.getId(videoId);
        if (!video_id) throw new Error('Video not found');

        const result = await query(
            `INSERT INTO comments (user_id, video_id, reply_id, comment_text)
             VALUES ($1, $2, $3, $4)
             RETURNING id, user_id, video_id, reply_id, comment_text, likes, published_at`,
            [userId, video_id, replyId || null, text]
        );
        return result.rows[0];
    }

    static async deleteComment(commentId, userId) {
        await query(
            'DELETE FROM comments WHERE id = $1 AND user_id = $2',
            [commentId, userId]
        );
    }

    static async getComments(videoId) {
        const result = await query(
            `SELECT
                c.id,
                c.reply_id,
                c.likes,
                c.comment_text,
                c.published_at,
                u.id        AS user_id,
                u.user_id   AS handle,
                u.name,
                u.pfp
             FROM comments c
             JOIN users u   ON u.id = c.user_id
             JOIN videos v  ON v.id = c.video_id
             WHERE v.video_id = $1
             ORDER BY c.published_at DESC`,
            [videoId]
        );

        return result.rows.map(row => ({
            id:        row.id,
            replyId:   row.reply_id,
            user: {
                id:     row.user_id,
                handle: row.handle,
                name:   row.name,
                avatar: row.pfp
            },
            likes:       row.likes,
            text:        row.comment_text,
            publishedAt: row.published_at
        }));
    }

    // ── Interactions ───────────────────────────────────────────
    static async getInteraction(userId, videoId) {
        const vidId = await VideoModel.getId(videoId);
        if (!vidId) throw new Error('Video not found');
        if (!userId) return [];

        const result = await query(
            `SELECT comment_id AS id, type
             FROM comment_interactions
             WHERE user_id = $1 AND video_id = $2`,
            [userId, vidId]
        );

        return result.rows.map(row => ({ id: row.id, type: row.type }));
    }

    static async addInteraction(userId, videoId, commentId, interaction) {
        const vidId = await VideoModel.getId(videoId);
        if (!vidId) throw new Error('Video not found');

        const existing = await query(
            `SELECT id, type FROM comment_interactions
             WHERE user_id = $1 AND comment_id = $2`,
            [userId, commentId]
        );

        // Undo — remove interaction
        if (!interaction) {
            if (existing.rows[0]) {
                await query(
                    `DELETE FROM comment_interactions
                     WHERE user_id = $1 AND comment_id = $2`,
                    [userId, commentId]
                );
            }
            return null;
        }

        if (existing.rows[0]) {
            if (existing.rows[0].type === interaction) {
                // Same type — toggle off
                await query(
                    `DELETE FROM comment_interactions
                     WHERE user_id = $1 AND comment_id = $2`,
                    [userId, commentId]
                );
                return null;
            } else {
                // Switch type
                await query(
                    `UPDATE comment_interactions SET type = $1
                     WHERE user_id = $2 AND comment_id = $3`,
                    [interaction, userId, commentId]
                );
                return interaction;
            }
        }

        // New interaction
        await query(
            `INSERT INTO comment_interactions (video_id, user_id, comment_id, type)
             VALUES ($1, $2, $3, $4)`,
            [vidId, userId, commentId, interaction]
        );
        return interaction;
    }
}

export default CommentModel;