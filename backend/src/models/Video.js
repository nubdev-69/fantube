// src/models/Video.js
// This file handles all database operations for videos

import { query } from '../database/config/database.js';

function formatRows(rows) {
  return rows.map(row => ({
    videoId: row.video_id,
    title: row.title,
    thumbnail: {
      url: row.thumbnail,
      width: 1280,
      height: 720
    },
    channel: {
      id: row.channel_id,
      handle: row.handle,
      name: row.channel_name,
      avatar: row.channel_avatar,
    },
    duration: row.duration || null,
    views: row.views || 0,
    likes: row.likes || 0,
    tags: row.tags || [],
    category: row.category || null,
    publishedAt: row.published_at,
    feedSource: row.feed_source,
  }));
}
class VideoModel {
  // this function will return video id and act as a helper function to find id
  // find id by url or video_id ://
  static async getId(videoId) {
    const result = await query(
      `select id from videos where video_id=$1`, [videoId]
    )
    return result.rows[0]?.id || null;
  }

  static async getChannelId(videoId) {
    const result = await query(
      `SELECT 
          v.channel_id AS id,
          c.user_id AS channelOwnerId
      FROM videos v 
      JOIN channels c ON v.channel_id = c.id 
      WHERE v.video_id = $1`,
      [videoId]
    );
    return result.rows[0] || null;
  }


  // Create a new video
  //   static async create({ title, description, thumbnail, videoUrl, channelId, createdBy, visibility }) {
  //     const result = await query(
  //       `INSERT INTO videos (title, description, thumbnail, video_url, channel_id, created_by, visibility) 
  //        VALUES ($1, $2, $3, $4, $5, $6, $7) 
  //        RETURNING *`,
  //       [title, description, thumbnail, videoUrl, channelId, createdBy, visibility || 'public']
  //     );
  //     return result.rows[0];
  //   }
  static async create({ videoId, title, description, thumbnail_url, video_url, channelId, createdBy, visibility, duration, tags, category }) {

    const result = await query(
      `insert into videos(video_id,title,description,thumbnail,video_url,channel_id,created_by,visibility)
            values($1,$2,$3,$4,$5,$6,$7,$8)
            returning *`,
      [videoId, title, description, thumbnail_url, video_url, channelId, createdBy, visibility || 'public']
    );
    const video = result.rows[0];

    await query(
      `Insert into video_meta(
            video_id,duration,tags,category
          ) values($1,$2,$3,$4)`,
      [video.id, duration, tags || [], category || null]
    )
    return video;
  }
  // Get all public videos (with pagination)
  static async findAll({ page = 1, limit = 15, userId = null }) {
    const offset = (page - 1) * limit;

    const totalResult = await query(
      `SELECT COUNT(*) FROM videos WHERE visibility = 'public'`
    );
    const totalPublicVideos = parseInt(totalResult.rows[0].count);

    let historyCount = 0;
    if (userId) {
      const historyResult = await query(
        `SELECT COUNT(*) FROM watch_history WHERE user_id = $1`,
        [userId]
      );
      historyCount = parseInt(historyResult.rows[0].count);
    }

    // Drop threshold to 1 — personalize after just one watch
    const useColdStart = !userId || historyCount < 1 || totalPublicVideos <= limit;

    // ── Cold start ─────────────────────────────────────────────────
    if (useColdStart) {
      const result = await query(
        `SELECT DISTINCT ON (vm.category)
              v.id, v.video_id, v.title, v.thumbnail, v.views, v.likes,
              v.published_at, c.name AS channel_name, c.id AS channel_id,
              u.user_id AS handle, u.pfp AS channel_avatar,
              vm.duration, vm.tags, vm.category,
              'cold_start' AS feed_source,
              (v.views * 0.6 + v.likes * 0.4)
              * EXP(-0.03 * EXTRACT(EPOCH FROM (NOW() - v.published_at)) / 86400)
              AS feed_score
          FROM videos v
          JOIN channels c      ON v.channel_id = c.id
          LEFT JOIN users u    ON v.created_by = u.id
          LEFT JOIN video_meta vm ON v.id = vm.video_id
          WHERE v.visibility = 'public'
            AND vm.category IS NOT NULL
          ORDER BY vm.category, feed_score DESC`,
        []
      );

      const categoryVideos = result.rows;
      const categoryIds = new Set(categoryVideos.map(r => r.id));

      const fillResult = await query(
        `SELECT
              v.id, v.video_id, v.title, v.thumbnail, v.views, v.likes,
              v.published_at, c.name AS channel_name, c.id AS channel_id,
              u.user_id AS handle, u.pfp AS channel_avatar,
              vm.duration, vm.tags, vm.category,
              'cold_start' AS feed_source,
              (v.views * 0.6 + v.likes * 0.4)
              * EXP(-0.03 * EXTRACT(EPOCH FROM (NOW() - v.published_at)) / 86400)
              AS feed_score
          FROM videos v
          JOIN channels c      ON v.channel_id = c.id
          LEFT JOIN users u    ON v.created_by = u.id
          LEFT JOIN video_meta vm ON v.id = vm.video_id
          WHERE v.visibility = 'public'
            AND v.id != ALL($1::int[])
          ORDER BY feed_score DESC
          LIMIT $2 OFFSET $3`,
        [
          categoryIds.size > 0 ? [...categoryIds] : [0],
          Math.max(0, limit - categoryVideos.length + offset),
          0
        ]
      );

      const combined = [...categoryVideos, ...fillResult.rows];
      const paginated = combined.slice(offset, offset + limit);
      return formatRows(paginated);
    }

    // ── Gather user signals in parallel ───────────────────────────
    const [subsRes, likedRes, watchedCategoryRes] = await Promise.all([
      query(`SELECT channel_id FROM subscriptions WHERE user_id = $1`, [userId]),
      query(
        `SELECT vm.tags, vm.category, v.channel_id,
           EXP(-0.02 * EXTRACT(EPOCH FROM (NOW() - i.created_at)) / 86400) AS recency_weight
         FROM interactions i
         JOIN videos v      ON v.id = i.video_id
         JOIN video_meta vm ON vm.video_id = v.id
         WHERE i.user_id = $1 AND i.interaction_type = 'like'
         ORDER BY i.created_at DESC LIMIT 100`,
        [userId]
      ),
      // Get watched categories with counts for soft boost calculation
      query(
        `SELECT vm.category, COUNT(*) as cnt,
           SUM(CASE WHEN wh.completed THEN 2 ELSE 1 END) as weight
         FROM watch_history wh
         JOIN videos v ON wh.video_id = v.id
         JOIN video_meta vm ON v.id = vm.video_id
         WHERE wh.user_id = $1 AND vm.category IS NOT NULL
         GROUP BY vm.category
         ORDER BY weight DESC`,
        [userId]
      )
    ]);

    const subscribedChannelIds = subsRes.rows.map(r => r.channel_id);

    const likedTagCounts = {};
    const likedCategories = {};
    const likedChannelIds = new Set();

    likedRes.rows.forEach(row => {
      const w = parseFloat(row.recency_weight);
      if (row.category) {
        likedCategories[row.category] = (likedCategories[row.category] || 0) + w;
      }
      if (row.channel_id) likedChannelIds.add(row.channel_id);
      (row.tags || []).forEach(tag => {
        likedTagCounts[tag] = (likedTagCounts[tag] || 0) + w;
      });
    });

    // Build watched category boost — soft boost for watched categories
    // but hard cap so it never floods. With only 1 watch, this gives
    // a gentle nudge toward that category without dominating.
    const watchedCategoryBoosts = {};
    watchedCategoryRes.rows.forEach(row => {
      const cnt = parseInt(row.cnt);
      // Boost formula: high for first few watches, tapers off aggressively
      // 1 watch = +8, 2 = +10, 3 = +11, 5+ = capped at 12
      // This means single-watch categories get boosted but not flooded
      watchedCategoryBoosts[row.category] = Math.min(8 + Math.log(cnt) * 3, 12);
    });

    const topLikedTags = Object.entries(likedTagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([tag]) => tag);

    const subscribedParam   = subscribedChannelIds.length > 0 ? subscribedChannelIds : [0];
    const likedChannelParam = likedChannelIds.size > 0 ? [...likedChannelIds] : [0];
    const likedTagsParam    = topLikedTags.length > 0 ? topLikedTags : [''];

    const topLikedCategories = Object.entries(likedCategories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const likedCategoryJson = JSON.stringify(
      Object.fromEntries(
        topLikedCategories.map(([cat, score]) => [
          cat,
          Math.min(parseFloat(score.toFixed(4)), 20)
        ])
      )
    );

    // Watched category boost as jsonb — same safe pattern
    const watchedCategoryJson = JSON.stringify(watchedCategoryBoosts);

    const result = await query(
      `WITH
      liked_category_scores AS (
          SELECT key AS category, value::numeric AS score
          FROM jsonb_each_text($7::jsonb)
      ),

      -- NEW: watched category soft boost
      watched_category_boost AS (
          SELECT key AS category, value::numeric AS boost
          FROM jsonb_each_text($8::jsonb)
      ),

      user_tag_weights AS (
          SELECT
              unnested_tag AS tag,
              SUM(
                  CASE
                      WHEN wh.completed           THEN 2.0
                      WHEN wh.watch_duration > 60 THEN 0.5
                      ELSE 0.1
                  END
                  * EXP(-0.08 * EXTRACT(EPOCH FROM (NOW() - wh.watched_at)) / 86400)
              ) AS weight
          FROM watch_history wh
          JOIN videos v      ON wh.video_id = v.id
          JOIN video_meta vm ON v.id = vm.video_id
          LEFT JOIN LATERAL UNNEST(COALESCE(vm.tags, '{}')) AS unnested_tag ON TRUE
          WHERE wh.user_id = $1
          GROUP BY unnested_tag
      ),

      user_category_weights AS (
          SELECT
              vm.category,
              COUNT(*) AS watch_count,
              SUM(CASE WHEN wh.completed THEN 1 ELSE 0 END) AS completed_count,
              -- Softer diversity penalty — allows same category but tapers
              CASE
                  WHEN COUNT(*) > 10 THEN 0.35
                  WHEN COUNT(*) > 7  THEN 0.5
                  WHEN COUNT(*) > 5  THEN 0.65
                  WHEN COUNT(*) > 3  THEN 0.8
                  WHEN COUNT(*) > 1  THEN 0.92
                  ELSE 1.0           -- 1 watch = no penalty, just a boost
              END AS diversity_penalty
          FROM watch_history wh
          JOIN videos v      ON wh.video_id = v.id
          JOIN video_meta vm ON v.id = vm.video_id
          WHERE wh.user_id = $1
          GROUP BY vm.category
      ),

      channel_affinity AS (
          SELECT
              v.channel_id,
              COUNT(*) AS watch_count,
              SUM(CASE WHEN wh.completed THEN 1 ELSE 0 END) AS completed_count,
              CASE
                  WHEN COUNT(*) > 15 THEN 0.3
                  WHEN COUNT(*) > 10 THEN 0.5
                  WHEN COUNT(*) > 5  THEN 0.75
                  ELSE 1.0
              END AS channel_diversity_penalty
          FROM watch_history wh
          JOIN videos v ON wh.video_id = v.id
          WHERE wh.user_id = $1
          GROUP BY v.channel_id
      ),

      subscribed_channels AS (
          SELECT channel_id FROM subscriptions WHERE user_id = $1
      ),

      already_watched AS (
          SELECT DISTINCT video_id FROM watch_history WHERE user_id = $1
      ),

      personalized_raw AS (
          SELECT
              v.id, v.video_id, v.title, v.thumbnail, v.views, v.likes,
              v.published_at, c.name AS channel_name, c.id AS channel_id,
              u.user_id AS handle, u.pfp AS channel_avatar,
              vm.duration, vm.tags, vm.category,
              'personalized' AS feed_source,
              (
                  -- Watch-based tag affinity
                  COALESCE(SUM(utw.weight), 0) * 1.0

                  -- Liked tag overlap
                  + (
                      SELECT COUNT(*)
                      FROM UNNEST(COALESCE(vm.tags, '{}')) t
                      WHERE t = ANY($2::text[])
                  ) * 4.0

                  -- Liked category bonus
                  + COALESCE((
                      SELECT lcs.score * 10.0
                      FROM liked_category_scores lcs
                      WHERE lcs.category = vm.category
                    ), 0)

                  -- NEW: watched category soft boost
                  -- gives more of same category but tapered
                  + COALESCE((
                      SELECT wcb.boost
                      FROM watched_category_boost wcb
                      WHERE wcb.category = vm.category
                    ), 0)

                  -- Liked channel bonus
                  + CASE WHEN v.channel_id = ANY($3::int[]) THEN 10.0 ELSE 0.0 END

                  -- Channel watch affinity
                  + (
                      COALESCE(MAX(ca.completed_count), 0) * 1.5
                      + COALESCE(MAX(ca.watch_count), 0) * 0.3
                    ) * COALESCE(MAX(ca.channel_diversity_penalty), 1.0)

                  -- Subscription bonus
                  + CASE WHEN sc.channel_id IS NOT NULL THEN 5.0 ELSE 0.0 END

                  -- Freshness
                  + (2.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - v.published_at)) / 86400.0))

                  -- Engagement quality
                  + (v.likes::float / NULLIF(v.views, 0)::float) * 80.0
              )
              * COALESCE(MAX(ucw.diversity_penalty), 1.0)
              AS feed_score

          FROM videos v
          JOIN channels c      ON v.channel_id = c.id
          LEFT JOIN users u    ON v.created_by = u.id
          LEFT JOIN video_meta vm ON v.id = vm.video_id
          LEFT JOIN LATERAL UNNEST(COALESCE(vm.tags, '{}')) AS unnested_tag ON TRUE
          LEFT JOIN user_tag_weights utw   ON unnested_tag = utw.tag
          LEFT JOIN channel_affinity ca    ON v.channel_id = ca.channel_id
          LEFT JOIN subscribed_channels sc ON v.channel_id = sc.channel_id
          LEFT JOIN user_category_weights ucw ON vm.category = ucw.category
          LEFT JOIN already_watched aw     ON v.id = aw.video_id
          WHERE v.visibility = 'public'
            AND aw.video_id IS NULL
          GROUP BY
              v.id, v.video_id, v.title, v.thumbnail, v.views, v.likes,
              v.published_at, c.name, c.id, u.user_id, u.pfp,
              vm.duration, vm.tags, vm.category, sc.channel_id
      ),

      -- Per-category cap: with 1 watch allow up to 5 from that category,
      -- but other categories still get 3 each — so feed stays mixed
      personalized_ranked AS (
          SELECT *,
              ROW_NUMBER() OVER (
                  PARTITION BY category
                  ORDER BY feed_score DESC
              ) AS cat_rank
          FROM personalized_raw
      ),

      personalized AS MATERIALIZED (
          SELECT
              id, video_id, title, thumbnail, views, likes,
              published_at, channel_name, channel_id, handle,
              channel_avatar, duration, tags, category,
              feed_source,
              -- KEY: apply jitter here so each reload differs slightly
              -- 0.80 to 1.20 range — meaningful shuffle without destroying relevance
              feed_score * (0.80 + RANDOM() * 0.40) AS feed_score
          FROM personalized_ranked
          WHERE cat_rank <= 5   -- allow up to 5 from a single category
          ORDER BY feed_score DESC
          LIMIT 28
      ),

      trending_ranked AS (
          SELECT
              v.id, v.video_id, v.title, v.thumbnail, v.views, v.likes,
              v.published_at, c.name AS channel_name, c.id AS channel_id,
              u.user_id AS handle, u.pfp AS channel_avatar,
              vm.duration, vm.tags, vm.category,
              'trending' AS feed_source,
              (
                  v.views * 0.4
                  + v.likes * 3.0
                  + v.comment_count * 2.0
                  + (v.likes::float / NULLIF(v.views, 0)::float) * 150.0
              )
              * (1.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - v.published_at)) / 86400.0 / 5.0))
              AS feed_score,
              ROW_NUMBER() OVER (
                  PARTITION BY vm.category
                  ORDER BY (v.likes * 3.0 + v.comment_count * 2.0 + v.views * 0.4) DESC
              ) AS category_rank
          FROM videos v
          JOIN channels c      ON v.channel_id = c.id
          LEFT JOIN users u    ON v.created_by = u.id
          LEFT JOIN video_meta vm ON v.id = vm.video_id
          LEFT JOIN already_watched aw ON v.id = aw.video_id
          WHERE v.visibility = 'public'
            AND aw.video_id IS NULL
            AND vm.category IS NOT NULL
      ),

      trending AS MATERIALIZED (
          SELECT
              id, video_id, title, thumbnail, views, likes,
              published_at, channel_name, channel_id, handle,
              channel_avatar, duration, tags, category,
              feed_source,
              -- Jitter trending too
              feed_score * (0.85 + RANDOM() * 0.30) AS feed_score
          FROM trending_ranked
          WHERE category_rank <= 2
      ),

      discovery AS MATERIALIZED (
          SELECT
              v.id, v.video_id, v.title, v.thumbnail, v.views, v.likes,
              v.published_at, c.name AS channel_name, c.id AS channel_id,
              u.user_id AS handle, u.pfp AS channel_avatar,
              vm.duration, vm.tags, vm.category,
              'discovery' AS feed_source,
              -- Full random for discovery — completely different each reload
              (v.views * 0.7 + v.likes * 2.0) * RANDOM() AS feed_score
          FROM videos v
          JOIN channels c ON v.channel_id = c.id
          LEFT JOIN users u ON v.created_by = u.id
          LEFT JOIN video_meta vm ON v.id = vm.video_id
          LEFT JOIN user_category_weights ucw ON vm.category = ucw.category
          LEFT JOIN already_watched aw ON v.id = aw.video_id
          WHERE v.visibility = 'public'
            AND aw.video_id IS NULL
            AND vm.category IS NOT NULL
            AND (ucw.watch_count IS NULL OR ucw.watch_count <= 2)
          LIMIT 12
      ),

      sub_recent AS (
          SELECT
              v.id, v.video_id, v.title, v.thumbnail, v.views, v.likes,
              v.published_at, c.name AS channel_name, c.id AS channel_id,
              u.user_id AS handle, u.pfp AS channel_avatar,
              vm.duration, vm.tags, vm.category,
              'subscribed' AS feed_source,
              (
                  v.likes * 2.0 + v.views * 0.1
                  + (5.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - v.published_at)) / 86400.0))
              ) AS feed_score
          FROM videos v
          JOIN channels c      ON v.channel_id = c.id
          LEFT JOIN users u    ON v.created_by = u.id
          LEFT JOIN video_meta vm ON v.id = vm.video_id
          LEFT JOIN already_watched aw ON v.id = aw.video_id
          WHERE v.visibility = 'public'
            AND v.channel_id = ANY($4::int[])
            AND aw.video_id IS NULL
          ORDER BY v.published_at DESC
          LIMIT 10
      ),

      all_scored AS (
          SELECT *, ROW_NUMBER() OVER (ORDER BY feed_score DESC) AS rn
          FROM personalized
          UNION ALL
          SELECT *, ROW_NUMBER() OVER (ORDER BY feed_score DESC) AS rn
          FROM trending
          WHERE id NOT IN (SELECT id FROM personalized)
          UNION ALL
          SELECT *, ROW_NUMBER() OVER (ORDER BY feed_score DESC) AS rn
          FROM sub_recent
          WHERE id NOT IN (SELECT id FROM personalized)
            AND id NOT IN (SELECT id FROM trending)
          UNION ALL
          SELECT *, ROW_NUMBER() OVER (ORDER BY feed_score DESC) AS rn
          FROM discovery
          WHERE id NOT IN (SELECT id FROM personalized)
            AND id NOT IN (SELECT id FROM trending)
            AND id NOT IN (SELECT id FROM sub_recent)
      )

      SELECT
          id, video_id, title, thumbnail, views, likes,
          published_at, channel_name, channel_id, handle,
          channel_avatar, duration, tags, category,
          feed_source, feed_score
      FROM all_scored
      ORDER BY
          CASE feed_source
              WHEN 'personalized' THEN (rn - 1) * 4 + 1
              WHEN 'trending'     THEN (rn - 1) * 4 + 2
              WHEN 'subscribed'   THEN (rn - 1) * 4 + 3
              WHEN 'discovery'    THEN (rn - 1) * 4 + 4
          END
      LIMIT $5 OFFSET $6`,
      [
        userId,
        likedTagsParam,
        likedChannelParam,
        subscribedParam,
        limit,
        offset,
        likedCategoryJson,
        watchedCategoryJson  // $8
      ]
    );

    return formatRows(result.rows);
  }


  static async findById(id) {
    // Find video by ID
    const result = await query(
      `SELECT
            v.id, 
            v.video_id,
            v.title,
            v.description,
            v.video_url,
            v.thumbnail,
            v.visibility, 
            v.comments_enabled,
            v.comment_count,
            v.views,
            v.likes,
            v.dislikes,
            v.published_at,
            c.id as channel_id,
            u.id as owner_id,
            u.user_id        AS handle,
            c.name      AS channel_name,
            u.pfp  AS channel_avatar,
            c.subs_count,
            vm.duration,
            vm.tags,
            vm.category
        FROM videos v
        JOIN channels c ON v.channel_id = c.id
        JOIN users u ON v.created_by = u.id
        LEFT JOIN video_meta vm ON vm.video_id = v.id
        WHERE v.video_id = $1`,
      [id]
    );

    const row = result.rows[0];
    if (!row) return null;

    // Shape it into the format you want
    return {
      id: row.id,
      videoId: row.video_id,
      title: row.title,
      description: row.description,
      url: row.video_url,
      thumbnail: {
        url: row.thumbnail,
        width: 1280,
        height: 720
      },
      channel: {
        id: row.channel_id,
        ownerId: row.owner_id,
        handle: row.handle,
        name: row.channel_name,
        avatar: row.channel_avatar,
        subsCount: row.subs_count
      },
      duration: row.duration || 0,
      views: row.views || 0,
      likes: row.likes || 0,
      dislikes: row.dislikes || 0,
      commentCount: row.comment_count || 0,
      tags: row.tags || [],
      category: row.category || null,
      visibility: row.visibility,
      commentsEnabled: row.comments_enabled,
      publishedAt: row.published_at
    };
  }
  static async findByTitle(title) {
    const result = await query(
      `select 
        v.*,
        c.name as channel_name,
        c.user_id as channel_owner_id,
        u.name as creator_name,
        from videos v
        join channels c on v.channel_id=c.id
        join users u on v.created_by = u.id
        WHERE v.visibility = 'public'
        and v.title ilike $1
        ORDER BY v.published_at DESC
        `,
      [`%${title}`]
    );
    return result.rows;
  }

  // Find videos by channel
  static async findByChannel(channelId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT * FROM videos 
       WHERE channel_id = $1 AND visibility = 'public'
       ORDER BY published_at DESC
       LIMIT $2 OFFSET $3`,
      [channelId, limit, offset]
    );
    return result.rows;
  }

  // Update video
  static async update(videoId, { title, description, thumbnail, visibility, commentsEnabled, tags, category }) {
    const result = await query(
      `UPDATE videos 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           thumbnail = COALESCE($3, thumbnail),
           visibility = COALESCE($4, visibility),
           comments_enabled=coalesce($5,comments_enabled),
           updated_at = CURRENT_TIMESTAMP
       WHERE video_id = $6
       RETURNING *`,
      [title, description, thumbnail, visibility, commentsEnabled, videoId]
    );
    if (!result.rows[0]) throw new Error('Video not found');
    await query(`
    update video_meta 
    set tags=coalesce($1,tags),
    category=coalesce($2,category)
    where video_id=$3
    `, [tags, category, result.rows[0].id]);
    return result.rows[0];
  }

  // Delete video
  static async delete(id) {
    await query('DELETE FROM videos WHERE id = $1', [id]);
    return { deleted: true };
  }

  // Search videos
  static async search(searchTerm, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT 
        v.*, 
        c.name as channel_name
       FROM videos v
       JOIN channels c ON v.channel_id = c.id
       WHERE v.visibility = 'public' 
       AND (v.title ILIKE $1 OR v.description ILIKE $1)
       ORDER BY v.published_at DESC
       LIMIT $2 OFFSET $3`,
      [`%${searchTerm}%`, limit, offset]
    );
    return result.rows;
  }

  static async getSuggested(req, res, next) {
    try {
      const { videoId } = req.params;
      const userId = req.userId;

      const currentVideo = await query(
        `SELECT v.id, v.channel_id, vm.category, vm.tags
         FROM videos v
         JOIN video_meta vm ON vm.video_id = v.id
         WHERE v.video_id = $1`,
        [videoId]
      );

      if (!currentVideo.rows[0]) return res.status(404).json({ error: 'Video not found' });

      const { id: currentId, channel_id, category, tags } = currentVideo.rows[0];
      const safeTags = tags || [];

      let watchedIds = [];
      let subscribedChannelIds = [];
      let likedTags = [];   // NEW
      let likedCategories = {};   // NEW — { category: count }
      let likedChannelIds = [];   // NEW

      if (userId) {
        const [watchedRes, subsRes, likedRes] = await Promise.all([
          query(
            `SELECT DISTINCT video_id FROM watch_history WHERE user_id = $1`,
            [userId]
          ),
          query(
            `SELECT channel_id FROM subscriptions WHERE user_id = $1`,
            [userId]
          ),
          // Pull everything about videos the user liked
          query(
            `SELECT
               vm.tags,
               vm.category,
               v.channel_id,
               -- Recency weight: likes decay slower than watches (intentional signal)
               EXP(-0.02 * EXTRACT(EPOCH FROM (NOW() - i.created_at)) / 86400) AS recency_weight
             FROM interactions i
             JOIN videos v       ON v.id = i.video_id
             JOIN video_meta vm  ON vm.video_id = v.id
             WHERE i.user_id = $1
               AND i.interaction_type = 'like'
             ORDER BY i.created_at DESC
             LIMIT 50`,
            [userId]
          )
        ]);

        watchedIds = watchedRes.rows.map(r => r.video_id);
        subscribedChannelIds = subsRes.rows.map(r => r.channel_id);

        // Process liked videos into usable signals
        likedRes.rows.forEach(row => {
          const weight = parseFloat(row.recency_weight);

          // Accumulate liked categories with recency weight
          if (row.category) {
            likedCategories[row.category] =
              (likedCategories[row.category] || 0) + weight;
          }

          // Collect liked channel ids (deduplicated later)
          if (row.channel_id) {
            likedChannelIds.push(row.channel_id);
          }

          // Flatten and collect all tags from liked videos
          if (row.tags && row.tags.length > 0) {
            row.tags.forEach(tag => {
              likedTags.push(tag);
            });
          }
        });

        // Deduplicate channels, keep unique
        likedChannelIds = [...new Set(likedChannelIds)];
      }

      const watchedIdsParam = watchedIds.length > 0 ? watchedIds : [0];
      const subscribedParam = subscribedChannelIds.length > 0 ? subscribedChannelIds : [0];
      const tagsParam = safeTags.length > 0 ? safeTags : [''];
      const likedTagsParam = likedTags.length > 0 ? likedTags : [''];
      const likedChannelParam = likedChannelIds.length > 0 ? likedChannelIds : [0];

      // Current video's category liked score (how much user likes this category)
      const currentCategoryLikedScore = Math.round((likedCategories[category] || 0) * 100) / 100;

      const result = await query(
        `WITH base AS (
          SELECT
            v.id,
            v.video_id,
            v.title,
            v.thumbnail,
            v.views,
            v.likes,
            v.comment_count,
            v.published_at,
            v.channel_id,
            c.name      AS channel,
            u.pfp,
            u.user_id   AS handle,
            vm.duration,
            vm.category,
            vm.tags,

            -- 1. Same category as current video (moderate)
            CASE WHEN LOWER(vm.category) = LOWER($2) THEN 15 ELSE 0 END

            -- 2. Tag overlap with CURRENT video
            + (
                SELECT COUNT(*)
                FROM UNNEST(COALESCE(vm.tags, '{}')) t
                WHERE t = ANY($3::text[])
            ) * 5

            -- 3. Tag overlap with user's LIKED videos (stronger signal)
            + (
                SELECT COUNT(*)
                FROM UNNEST(COALESCE(vm.tags, '{}')) t
                WHERE t = ANY($7::text[])
            ) * 8

            -- 4. Category the user has liked before (weighted by how much they liked it)
            + CASE
    WHEN vm.category IS NOT NULL AND vm.category = $9 THEN $10::numeric * 12
    ELSE 0
  END

            -- 5. Same channel as current video (small, avoid spam)
            + CASE WHEN v.channel_id = $4 THEN 6 ELSE 0 END

            -- 6. Subscribed channel bonus
            + CASE WHEN v.channel_id = ANY($5::int[]) THEN 10 ELSE 0 END

            -- 7. Channel the user has liked from before (NEW)
            + CASE WHEN v.channel_id = ANY($8::int[]) THEN 14 ELSE 0 END

            -- 8. Trending signal
            + (
                COALESCE(v.likes, 0) * 3.0
                + COALESCE(v.comment_count, 0) * 2.0
                + COALESCE(v.views, 0) * 0.0002
            ) * (1.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - v.published_at)) / 86400.0 / 7.0))

            -- 9. Freshness
            + (3.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - v.published_at)) / 86400.0))

            -- 10. Watched penalty
            + CASE WHEN v.id = ANY($6::int[]) THEN -15 ELSE 0 END

            -- 11. Engagement quality (like ratio)
            + (COALESCE(v.likes, 0)::float / NULLIF(v.views, 0)::float) * 80.0

            AS raw_score

          FROM videos v
          JOIN channels c    ON c.id = v.channel_id
          JOIN users u       ON u.id = v.created_by
          JOIN video_meta vm ON vm.video_id = v.id
          WHERE v.visibility = 'public'
            AND v.id != $1
        ),

        scored AS (
          SELECT *,
            CASE
              WHEN LOWER(category) = LOWER($2)
                OR (
                    SELECT COUNT(*) FROM UNNEST(COALESCE(tags, '{}')) t
                    WHERE t = ANY($3::text[])
                ) > 0
              THEN 'related'
              WHEN channel_id = ANY($5::int[])
                OR channel_id = ANY($8::int[])
              THEN 'subscribed'
              ELSE 'discovery'
            END AS bucket,

            -- Controlled randomness to break linear ordering
            raw_score * (0.85 + RANDOM() * 0.30) AS final_score

          FROM base
        ),

        related_pool AS (
          SELECT * FROM scored WHERE bucket = 'related'
          ORDER BY final_score DESC LIMIT 10
        ),
        subscribed_pool AS (
          SELECT * FROM scored WHERE bucket = 'subscribed'
          ORDER BY final_score DESC LIMIT 6
        ),
        discovery_pool AS (
          SELECT * FROM scored WHERE bucket = 'discovery'
          ORDER BY final_score DESC LIMIT 8
        ),

        interleaved AS (
          SELECT *, ROW_NUMBER() OVER (ORDER BY final_score DESC) AS rn, 1 AS priority
          FROM related_pool
          UNION ALL
          SELECT *, ROW_NUMBER() OVER (ORDER BY final_score DESC) AS rn, 2 AS priority
          FROM subscribed_pool
          WHERE id NOT IN (SELECT id FROM related_pool)
          UNION ALL
          SELECT *, ROW_NUMBER() OVER (ORDER BY final_score DESC) AS rn, 3 AS priority
          FROM discovery_pool
          WHERE id NOT IN (SELECT id FROM related_pool)
            AND id NOT IN (SELECT id FROM subscribed_pool)
        )

        SELECT
          id, video_id, title, thumbnail, views, likes,
          published_at, channel, channel_id, pfp, handle,
          duration, category, tags, bucket, final_score
        FROM interleaved
        ORDER BY
          CASE bucket
            WHEN 'related'    THEN (rn - 1) * 3 + 1
            WHEN 'subscribed' THEN (rn - 1) * 3 + 2
            WHEN 'discovery'  THEN (rn - 1) * 3 + 3
          END
        LIMIT 22`,
        [
          currentId,           // $1
          category || '',      // $2 — current video category
          tagsParam,           // $3 — current video tags
          channel_id,          // $4 — current video channel
          subscribedParam,     // $5 — user's subscribed channel ids
          watchedIdsParam,     // $6 — user's watched video ids
          likedTagsParam,      // $7 — tags from user's liked videos (NEW)
          likedChannelParam,   // $8 — channels user has liked from (NEW)
          category || '',      // $9 — current category for liked-category scoring
          currentCategoryLikedScore  // $10 — how much user has liked this category (NEW)
        ]
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
          duration: row.duration || 0,
          category: row.category,
          bucket: row.bucket, // remove before production
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTrending({ category, limit = 20 }) {
    const result = await query(
      `SELECT
            v.video_id,
            v.title,
            v.thumbnail,
            v.views,
            v.likes,
            v.published_at,
            u.pfp,
            u.user_id   AS handle,
            c.name      AS channel,
            vm.duration,
            vm.category
         FROM videos v
         JOIN users u       ON v.created_by = u.id
         JOIN channels c    ON v.channel_id = c.id
         JOIN video_meta vm ON vm.video_id = v.id
         WHERE v.visibility = 'public'
           AND vm.category = $1
         ORDER BY
            (v.views * 0.5) +
            (v.likes * 0.3) +
            (EXTRACT(EPOCH FROM v.published_at) / EXTRACT(EPOCH FROM NOW()) * 0.2) DESC
         LIMIT $2`,
      [category, limit]
    );

    return result.rows.map(row => ({
      videoId: row.video_id,
      title: row.title,
      thumbnail: row.thumbnail,
      views: row.views || 0,
      likes: row.likes || 0,
      pfp: row.pfp,
      handle: row.handle,
      channel: row.channel,
      duration: row.duration || 0,
      category: row.category,
      publishedAt: row.published_at
    }));
  }

  static async Search(req, res, next) {
    try {
      const { q, filter = 'all', sort = 'relevance', page = 1, limit = 20 } = req.query;
      if (!q?.trim()) return res.json({ videos: [], channels: [], query: '' });

      const offset = (page - 1) * limit;
      const term = q.trim().toLowerCase();
      const searchTerm = `%${term}%`;

      let videos = [];
      let channels = [];

      if (filter === 'all' || filter === 'videos') {
        let orderBy;
        switch (sort) {
          case 'date':      orderBy = 'v.published_at DESC'; break;
          case 'views':     orderBy = 'v.views DESC'; break;
          case 'rating':    orderBy = 'v.likes DESC'; break;
          default:          orderBy = 'relevance_score DESC';
        }

        const videoResult = await query(
          `SELECT
              v.id,
              v.video_id,
              v.title,
              v.description,
              v.thumbnail,
              v.views,
              v.likes,
              v.published_at,
              c.name    AS channel,
              c.id      AS channel_id,
              u.pfp,
              u.user_id AS handle,
              vm.duration,
              vm.category,
              vm.tags,
              (
                  -- Title match: highest priority
                  CASE WHEN LOWER(v.title) LIKE $1       THEN 100 ELSE 0 END
                  -- Exact title word match: bonus
                  + CASE WHEN LOWER(v.title) LIKE $2     THEN 40  ELSE 0 END
                  -- Description match: medium
                  + CASE WHEN LOWER(v.description) LIKE $1 THEN 20 ELSE 0 END
                  -- Category match: medium
                  + CASE WHEN LOWER(vm.category) LIKE $1  THEN 30 ELSE 0 END
                  -- Tag match: lower priority (stored as single string)
                  + CASE WHEN LOWER(ARRAY_TO_STRING(COALESCE(vm.tags, '{}'), ' ')) LIKE $1
                         THEN 15 ELSE 0 END
                  -- Engagement boost (small tiebreaker)
                  + v.views * 0.0001
                  + v.likes * 0.001
              ) AS relevance_score
           FROM videos v
           JOIN channels c    ON c.id = v.channel_id
           JOIN users u       ON u.id = v.created_by
           JOIN video_meta vm ON vm.video_id = v.id
           WHERE v.visibility = 'public'
             AND (
                 LOWER(v.title)       LIKE $1
                 OR LOWER(v.description) LIKE $1
                 OR LOWER(vm.category)   LIKE $1
                 OR LOWER(ARRAY_TO_STRING(COALESCE(vm.tags, '{}'), ' ')) LIKE $1
             )
           ORDER BY ${orderBy}
           LIMIT $3 OFFSET $4`,
          [searchTerm, `% ${term}%`, limit, offset]
        );

        videos = videoResult.rows.map(row => ({
          id:          row.id,
          url:         row.video_id,
          title:       row.title,
          description: row.description,
          thumbnail:   row.thumbnail,
          views:       row.views || 0,
          likes:       row.likes || 0,
          publishedAt: row.published_at,
          channel:     row.channel,
          pfp:         row.pfp,
          handle:      row.handle,
          duration:    row.duration || 0,
          category:    row.category,
          tags:        row.tags || []
        }));
      }

      if (filter === 'all' || filter === 'channels') {
        const channelResult = await query(
          `SELECT
              c.id,
              c.name,
              c.description,
              c.subs_count,
              c.video_count,
              c.total_views,
              u.pfp,
              u.user_id AS handle,
              (
                  -- Channel name: top priority
                  CASE WHEN LOWER(c.name)    LIKE $1 THEN 100 ELSE 0 END
                  -- Handle match: high priority
                  + CASE WHEN LOWER(u.user_id) LIKE $1 THEN 80  ELSE 0 END
                  -- Description: lower
                  + CASE WHEN LOWER(c.description) LIKE $1 THEN 20 ELSE 0 END
                  + c.subs_count * 0.001
              ) AS relevance_score
           FROM channels c
           JOIN users u ON u.id = c.user_id
           WHERE LOWER(c.name)        LIKE $1
              OR LOWER(u.user_id)     LIKE $1
              OR LOWER(c.description) LIKE $1
           ORDER BY relevance_score DESC
           LIMIT $2`,
          [searchTerm, limit]
        );

        channels = channelResult.rows.map(row => ({
          id:         row.id,
          name:       row.name,
          description: row.description,
          subsCount:  row.subs_count || 0,
          videoCount: row.video_count || 0,
          totalViews: row.total_views || 0,
          pfp:        row.pfp,
          handle:     row.handle
        }));
      }

      res.json({ query: q, filter, videos, channels });
    } catch (error) {
      next(error);
    }
  }

  // All tab — mixed trending feed with personalization + jitter
static async getExploreFeed({ userId = null, limit = 40 }) {

  // Pull liked/watch signals if user exists
  let likedTagsParam = [''];
  let likedChannelParam = [0];
  let watchedIds = [0];

  if (userId) {
      const [likedRes, watchedRes] = await Promise.all([
          query(
              `SELECT vm.tags, v.channel_id
               FROM interactions i
               JOIN videos v ON v.id = i.video_id
               JOIN video_meta vm ON vm.video_id = v.id
               WHERE i.user_id = $1 AND i.interaction_type = 'like'
               ORDER BY i.created_at DESC LIMIT 50`,
              [userId]
          ),
          query(
              `SELECT DISTINCT video_id FROM watch_history WHERE user_id = $1`,
              [userId]
          )
      ]);

      const tags = [];
      const channels = new Set();
      likedRes.rows.forEach(row => {
          (row.tags || []).forEach(t => tags.push(t));
          if (row.channel_id) channels.add(row.channel_id);
      });

      likedTagsParam    = tags.length > 0 ? [...new Set(tags)] : [''];
      likedChannelParam = channels.size > 0 ? [...channels] : [0];
      watchedIds        = watchedRes.rows.map(r => r.video_id);
      if (watchedIds.length === 0) watchedIds = [0];
  }

  const result = await query(
      `WITH engagement_scored AS (
          SELECT
              v.id,
              v.video_id,
              v.title,
              v.thumbnail,
              v.views,
              v.likes,
              v.comment_count,
              v.published_at,
              c.name      AS channel,
              c.id        AS channel_id,
              u.pfp,
              u.user_id   AS handle,
              vm.duration,
              vm.category,
              vm.tags,
              (
                  -- Engagement quality: high like ratio = quality signal
                  (v.likes::float / NULLIF(v.views, 0)::float) * 200.0
                  -- Raw engagement volume
                  + v.likes * 3.0
                  + v.comment_count * 2.0
                  + v.views * 0.05
                  -- Recency decay: newer gets more weight, 14-day half life
                  + (50.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - v.published_at)) / 86400.0 / 14.0))
                  -- Personalization: liked tag overlap
                  + (
                      SELECT COUNT(*) FROM UNNEST(COALESCE(vm.tags, '{}')) t
                      WHERE t = ANY($1::text[])
                  ) * 8.0
                  -- Personalization: liked channel
                  + CASE WHEN v.channel_id = ANY($2::int[]) THEN 15.0 ELSE 0.0 END
              ) AS base_score
          FROM videos v
          JOIN channels c      ON c.id = v.channel_id
          JOIN users u         ON u.id = v.created_by
          JOIN video_meta vm   ON vm.video_id = v.id
          WHERE v.visibility = 'public'
      ),
      jittered AS MATERIALIZED (
          SELECT *,
              -- Jitter: ±20% so each reload gives different order
              base_score * (0.80 + RANDOM() * 0.40) AS final_score,
              -- Rank within category to cap category domination
              ROW_NUMBER() OVER (
                  PARTITION BY category
                  ORDER BY base_score DESC
              ) AS cat_rank
          FROM engagement_scored
      )
      SELECT
          id, video_id, title, thumbnail, views, likes,
          published_at, channel, channel_id, pfp, handle,
          duration, category, tags
      FROM jittered
      WHERE cat_rank <= 6   -- max 6 per category keeps mix diverse
      ORDER BY final_score DESC
      LIMIT $3`,
      [likedTagsParam, likedChannelParam, limit]
  );

  return result.rows.map(row => ({
      videoId:     row.video_id,
      title:       row.title,
      thumbnail:   row.thumbnail,
      views:       row.views || 0,
      publishedAt: row.published_at,
      channel:     row.channel,
      channelId:   row.channel_id,
      pfp:         row.pfp,
      handle:      row.handle,
      duration:    row.duration || 0,
      category:    row.category
  }));
}

// Single category — trending + new mixed with jitter
static async getExploreCategory({ category, userId = null, limit = 30 }) {

  let watchedIds = [0];
  if (userId) {
      const w = await query(
          `SELECT DISTINCT video_id FROM watch_history WHERE user_id = $1`,
          [userId]
      );
      watchedIds = w.rows.map(r => r.video_id);
      if (watchedIds.length === 0) watchedIds = [0];
  }

  const result = await query(
      `WITH category_videos AS (
          SELECT
              v.id,
              v.video_id,
              v.title,
              v.thumbnail,
              v.views,
              v.likes,
              v.comment_count,
              v.published_at,
              c.name      AS channel,
              c.id        AS channel_id,
              u.pfp,
              u.user_id   AS handle,
              vm.duration,
              vm.category,
              vm.tags,
              (
                  -- High engagement top tier
                  (v.likes::float / NULLIF(v.views, 0)::float) * 300.0
                  + v.likes * 4.0
                  + v.comment_count * 3.0
                  + v.views * 0.08
                  -- Recency: 7-day half life for category pages (more recent bias)
                  + (80.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - v.published_at)) / 86400.0 / 7.0))
                  -- Small new-video boost so fresh content gets surfaced
                  + CASE
                      WHEN v.published_at >= NOW() - INTERVAL '3 days' THEN 20.0
                      WHEN v.published_at >= NOW() - INTERVAL '7 days' THEN 10.0
                      ELSE 0.0
                    END
              ) AS base_score
          FROM videos v
          JOIN channels c    ON c.id = v.channel_id
          JOIN users u       ON u.id = v.created_by
          JOIN video_meta vm ON vm.video_id = v.id
          WHERE v.visibility = 'public'
            AND LOWER(vm.category) = LOWER($1)
      ),
      jittered AS MATERIALIZED (
          SELECT *,
              -- Slightly less jitter on category page — relevance matters more here
              base_score * (0.88 + RANDOM() * 0.24) AS final_score
          FROM category_videos
      )
      SELECT
          id, video_id, title, thumbnail, views, likes,
          published_at, channel, channel_id, pfp, handle,
          duration, category, tags
      FROM jittered
      ORDER BY final_score DESC
      LIMIT $2`,
      [category, limit]
  );

  return result.rows.map(row => ({
      videoId:     row.video_id,
      title:       row.title,
      thumbnail:   row.thumbnail,
      views:       row.views || 0,
      publishedAt: row.published_at,
      channel:     row.channel,
      channelId:   row.channel_id,
      pfp:         row.pfp,
      handle:      row.handle,
      duration:    row.duration || 0,
      category:    row.category
  }));
}

  static async recordWatch(userId, videoId, duration, completed) {
    const result = await query(
      `INSERT INTO watch_history (user_id, video_id, watch_duration, completed)
       VALUES ($1, $2, $3, $4) returning id`,
      [userId || null, videoId, duration || 0, completed || false]
    );
    return result.rows[0];
  }
  static async updateWatch(viewId, duration, completed) {
    const result = await query(
      `update watch_history set watch_duration=$1,completed=$2 where id=$3`, [duration, completed, viewId]
    );
  }
  static async interactionStatus(userId, videoId) {
    const result = await query(
      `select id,interaction_type as interaction from interactions where user_id=$1 and video_id=$2`, [userId, videoId]
    )
    return result.rows[0] || null;
  }
  static async recordInteraction(userId, videoId, interaction) {
    const result = await query(
      `insert into interactions(user_id,video_id,interaction_type) values($1,$2,$3) returning id,interaction_type as interaction`, [userId, videoId, interaction]
    )
    return result.rows[0];
  }
  static async updateInteraction(id, interaction) {
    if (!interaction) {
      await query(`delete from interactions where id=$1`, [id]);
      return { id: null, interaction: null };
    }
    const result = await query(
      `update interactions set interaction_type=$1 where id=$2 returning id,interaction_type as interaction`, [interaction, id]
    );
    if (!result.rows[0]) {
      throw new Error(`Interaction with id ${id} not found`);
    }
    return result.rows[0];
  }
}

export default VideoModel;