// src/models/Channel.js
// This file handles all database operations for channels

import { query } from '../database/config/database.js';

class ChannelModel {
  // Create a new channel
  static async create({ userId, name, description, banner }) {
    const result = await query(
      `INSERT INTO channels (user_id, name, description, banner) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [userId, name, description, banner]
    );
    return result.rows[0];
  }


  // Find channel by ID


  static async findById(id) {
    const result = await query(
      `SELECT 
        c.*,
        u.name as owner_name,
        u.email as owner_email
       FROM channels c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [id]
    );
    return result.rows[0];
  }


  // static async findByName(name){
  //   const result = await query(
  //     'SELECT '
  //   )
  // }

  //get channelinfo for editing
  static async getMyChannel(id) {
    const result = await query(
      `SELECT c.name,
      u.user_id as handle,
      c.description,
      c.banner,
      c.links,
      u.pfp from channels c
      join users u on c.user_id=u.id
      where u.id=$1
      `, [id]
    )
    return result.rows[0] || null;
  }

  static async getStudioStats(req, res, next) {
    try {
      const userId = req.userId;

      const result = await query(
        `SELECT
                c.id,
                c.name,
                c.subs_count,
                c.video_count,
                c.total_views,
                u.pfp,
                u.user_id AS handle,
                u.name    AS user_name
             FROM channels c
             JOIN users u ON u.id = c.user_id
             WHERE c.user_id = $1`,
        [userId]
      );

      if (!result.rows[0]) return res.status(404).json({ error: 'Channel not found' });
      const row = result.rows[0];

      res.json({
        stats: {
          pfp: row.pfp,
          handle: row.handle,
          name: row.user_name,
          channel: row.name,
          subsCount: row.subs_count || 0,
          videoCount: row.video_count || 0,
          totalViews: row.total_views || 0,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // channelController.js
  static async searchChannel(req, res, next) {
    try {
      const { id } = req.params;       // channel id
      const { q } = req.query;         // search query
      const userId = req.userId;

      if (!q?.trim()) return res.json({ videos: [], playlists: [] });

      const channel = await ChannelModel.findByHandle(id);
      if (!channel) return res.status(404).json({ error: 'Channel not found' });

      const isOwner = channel.userId === userId;
      const searchTerm = `%${q.trim().toLowerCase()}%`;

      // search videos
      const videoResult = await query(
        `SELECT
              v.id,
              v.video_id,
              v.title,
              v.thumbnail,
              v.views,
              v.published_at,
              v.visibility,
              vm.duration
           FROM videos v
           JOIN video_meta vm ON vm.video_id = v.id
           WHERE v.channel_id = $1
             AND LOWER(v.title) LIKE $2
             AND (
                 v.visibility = 'public'
                 OR ($3 = true)
             )
           ORDER BY v.published_at DESC`,
        [channel.channelId, searchTerm, isOwner]
      );

      // search playlists
      const playlistResult = await query(
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
                  ORDER BY pv2.position ASC LIMIT 1
              ) AS cover
           FROM playlists p
           LEFT JOIN playlist_videos pv ON pv.playlist_id = p.id
           WHERE p.user_id = (SELECT user_id FROM channels WHERE id = $1)
             AND LOWER(p.name) LIKE $2
             AND (
                 p.visibility = 'public'
                 OR ($3 = true)
             )
             AND p.name NOT IN ('Liked Videos', 'Watch Later')
           GROUP BY p.id
           ORDER BY p.created_at DESC`,
        [channel.channelId, searchTerm, isOwner]
      );

      res.json({
        videos: videoResult.rows.map(row => ({
          id: row.id,
          videoId: row.video_id,
          title: row.title,
          thumbnail: row.thumbnail,
          views: row.views || 0,
          publishedAt: row.published_at,
          visibility: row.visibility,
          duration: row.duration || 0
        })),
        playlists: playlistResult.rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          visibility: row.visibility,
          videoCount: parseInt(row.video_count) || 0,
          cover: row.cover || null,
          createdAt: row.created_at
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyChannelVideos(userId) {
    const result = await query(
      `Select v.id,v.video_id as url,v.title,v.thumbnail,c.name as channel_name,u.user_id as handle,v.views, vm.duration,v.created_at from videos v join video_meta vm on vm.video_id=v.id join channels c on v.channel_id=c.id join users u on v.created_by=u.id where u.id=$1 ORDER BY v.created_at DESC`, [userId]
    );

    const rows = result.rows || null;
    if (!rows) return null;
    return rows.map(row => ({
      id: row.id,
      url: row.url,
      title: row.title,
      thumbnail: row.thumbnail,
      channel: {
        url: row.handle,
        name: row.channel_name
      },
      views: row.views,
      duration: row.duration,
      publishedAt: row.created_at
    })
    )
  }

  static async getChannelVideos(id, { page, limit }) {
    const offset = (page - 1) * limit;
    const result = await query(
      `Select v.id,v.video_id as url,v.title,v.thumbnail,c.name as channel_name,u.user_id as handle,v.views, vm.duration,v.created_at from videos v join video_meta vm on vm.video_id=v.id join channels c on v.channel_id=c.id join users u on v.created_by=u.id where v.visibility='public' and u.id=$1 ORDER BY v.created_at DESC LIMIT $2 OFFSET $3`, [id, limit, offset]
    );

    const rows = result.rows || null;
    console.log(rows);
    if (!rows) return null;
    return rows.map(row => ({
      id: row.id,
      url: row.url,
      title: row.title,
      thumbnail: row.thumbnail,
      channel: {
        url: row.handle,
        name: row.channel_name
      },
      views: row.views,
      duration: row.duration,
      publishedAt: row.created_at
    })
    )
  }

  //get videos for setting featured video

  static async getFeaturedVideos(id) {
    const result = await query(
      `SELECT 
          v.id,
          v.video_id,
          v.title,
          v.thumbnail,
          v.views,
          v.published_at as created_at,
          v.visibility,
          vm.duration,
          CASE WHEN c.featured_video = v.id THEN true ELSE false END AS is_featured
       FROM videos v
       LEFT JOIN video_meta vm ON vm.video_id = v.id
       LEFT JOIN channels c ON c.user_id = $1  
       WHERE v.created_by = $1
       ORDER BY 
          (v.views * 0.2) + 
          (EXTRACT(EPOCH FROM v.published_at) / EXTRACT(EPOCH FROM NOW()) * 0.8)
       LIMIT $2`,
      [id, 20]
    );
    return result.rows || null;
  }

  static async fetchFeaturedVideo(userHandle) {
    // First try to get the featured video
    const featured = await query(
      `SELECT 
            v.id, v.video_id AS url, v.title, v.thumbnail,
            u.user_id, c.name, v.views, vm.duration, v.created_at
         FROM videos v
         JOIN users u    ON v.created_by = u.id
         JOIN channels c ON c.user_id = u.id
         JOIN video_meta vm ON vm.video_id = v.id
         WHERE c.featured_video = v.id
           AND u.user_id = $1
           AND v.visibility = 'public'`,
      [userHandle]
    );

    if (featured.rows[0]) return featured.rows[0];

    // ✅ fallback — most popular recent video
    const fallback = await query(
      `SELECT 
            v.id, v.video_id AS url, v.title, v.thumbnail,
            u.user_id, c.name, v.views, vm.duration, v.created_at
         FROM videos v
         JOIN users u    ON v.created_by = u.id
         JOIN channels c ON c.user_id = u.id
         JOIN video_meta vm ON vm.video_id = v.id
         WHERE u.user_id = $1
           AND v.visibility = 'public'
         ORDER BY
            (v.likes * 0.5) +
            (v.views * 0.3) +
            (EXTRACT(EPOCH FROM v.created_at) / EXTRACT(EPOCH FROM NOW()) * 0.2) DESC
         LIMIT 1`,
      [userHandle]
    );

    return fallback.rows[0] || null;
  }

  static async getHomePlaylist(channelId, vis) {
    const playlistResult = await query(
      `SELECT
          p.id,
          p.name,
          p.description,
          p.visibility,
          p.created_at
       FROM playlists p
       LEFT JOIN channels c ON c.user_id = p.user_id
       WHERE c.id = $1
         AND (
             p.visibility = 'public'
             OR ($2 = 'private')
         )
         AND p.name NOT IN ('Liked Videos', 'Watch Later')
       ORDER BY p.created_at DESC
       LIMIT 3`,
      [channelId, vis]
    );

    if (playlistResult.rows.length === 0) return [];

    const playlists = await Promise.all(
      playlistResult.rows.map(async (playlist) => {
        const videoResult = await query(
          `SELECT
                  v.id,
                  v.video_id   AS url,
                  v.title,
                  v.thumbnail,
                  u.pfp,
                  u.user_id    AS handle,
                  vm.duration,
                  v.created_at,
                  v.visibility
               FROM playlist_videos pv
               JOIN videos v      ON v.id = pv.video_id
               JOIN users u       ON v.created_by = u.id
               JOIN video_meta vm ON vm.video_id = v.id
               WHERE pv.playlist_id = $1
                 AND (
                     v.visibility = 'public'
                     OR ($2 = 'private' AND v.visibility IN ('private', 'unlisted'))
                 )
               ORDER BY pv.position ASC`,
          [playlist.id, vis]
        );

        return {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description,
          visibility: playlist.visibility,
          createdAt: playlist.created_at,
          videoCount: videoResult.rows.length,
          videos: videoResult.rows.map(row => ({
            id: row.id,
            url: row.url,
            title: row.title,
            thumbnail: row.thumbnail,
            pfp: row.pfp,
            handle: row.handle,
            duration: row.duration,
            visibility: row.visibility,
            createdAt: row.created_at
          }))
        };
      })
    );

    return playlists;
  }

  // Find channel by user ID
  static async findByUserId(userId) {
    const result = await query(
      'SELECT c.*, u.pfp AS pfp, u.user_id AS handle FROM channels c JOIN users u ON u.id = c.user_id WHERE c.user_id = $1',
      [userId]
    );

    if (!result.rows[0]) return null;

    const channel = result.rows[0];

    // Parse links from JSON strings to objects at the source
    channel.links = (channel.links || []).map(link => {
        if (typeof link === 'string') {
            try { return JSON.parse(link); }
            catch { return { title: '', url: link }; }
        }
        return link;
    });

    return channel;
}
  static async getChannelByUserId(id) {
    const result = await query(
      'SELECT u.id,u.user_id from users u join channels c on c.user_id=u.id where c.user_id=$1', [id]
    );
    return result.rows[0] || null;
  }
  static async findByHandle(handle) {
    const result = await query(
      'select u.id as userId,c.id as channelId from users u join channels c on u.id=c.user_id where u.user_id=$1', [handle]
    )
    if (!result) return null;
    return {
      userId: result.rows[0].userid,
      channelId: result.rows[0].channelid
    }
  }

  static async getChannelInfo(handle) {
    const result = await query(
      'Select c.id,u.user_id as handle,c.name,u.pfp as avatar,c.banner,c.description,c.links as links,c.subs_count as subs,c.video_count as video, c.created_at as createdAt from users u join channels c on c.user_id=u.id where u.user_id=$1', [handle]
    );
    return result.rows[0];
  }
  // Update channel
  static async update(id, { name, description, banner, links, featuredVideoId }) {
    const result = await query(
      `UPDATE channels 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           banner = COALESCE($3, banner),
           links=coalesce($4,links),
           featured_video=coalesce($5,featured_video),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING name,description,banner,links,featured_video`,
      [name, description, banner, links, featuredVideoId, id]
    );
    return result.rows[0] || null;
  }

  // Delete channel
  static async delete(id) {
    await query('DELETE FROM channels WHERE id = $1', [id]);
    return { deleted: true };
  }

  // Get channel subscribers
  static async getSubscribers(channelId) {
    const result = await query(
      `SELECT 
        u.id, u.name, u.email, u.pfp,
        s.subscribed_at
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       WHERE s.channel_id = $1
       ORDER BY s.subscribed_at DESC`,
      [channelId]
    );
    return result.rows;
  }

  // Check if user is subscribed
  static async isSubscribed(userId, channelId) {
    const result = await query(
      'SELECT id FROM subscriptions WHERE user_id = $1 AND channel_id = $2',
      [userId, channelId]
    );
    return result.rows.length > 0;
  }

  // Subscribe to channel
  static async subscribe(userId, channelId) {
    const result = await query(
      'INSERT INTO subscriptions (user_id, channel_id) VALUES ($1, $2) RETURNING *',
      [userId, channelId]
    );
    return result.rows[0];
  }

  // Unsubscribe from channel
  static async unsubscribe(userId, channelId) {
    await query(
      'DELETE FROM subscriptions WHERE user_id = $1 AND channel_id = $2',
      [userId, channelId]
    );
    return { unsubscribed: true };
  }
}

export default ChannelModel;