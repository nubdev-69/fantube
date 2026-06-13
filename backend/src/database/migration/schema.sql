CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) UNIQUE NOT NULL,      -- human-readable @handle
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    pfp VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channels (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    banner VARCHAR(500),
    description TEXT,
    links TEXT[],
    subs_count INTEGER DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    featured_video INTEGER REFERENCES videos(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    video_id VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail VARCHAR(500),
    video_url VARCHAR(500) NOT NULL,
    channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- ✅ INTEGER not VARCHAR
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted')),
    comments_enabled BOOLEAN DEFAULT TRUE,
    comment_count INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,       
    likes INTEGER DEFAULT 0,    
    dislikes INTEGER DEFAULT 0,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE channels
ADD CONSTRAINT fk_featured_video
FOREIGN KEY (featured_video) REFERENCES videos(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS video_meta (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    duration INTEGER NOT NULL,
    tags TEXT[],
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(video_id)
);

CREATE TABLE IF NOT EXISTS interactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,   
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    interaction_type VARCHAR(20) CHECK (interaction_type IN ('like', 'dislike', 'save')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, video_id, interaction_type)
);

CREATE TABLE IF NOT EXISTS watch_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,   
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    watch_duration INTEGER,
    watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,   
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    reply_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comment_interactions(
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, 
    comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE, 
    type VARCHAR(10) CHECK (type IN ('like', 'dislike')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,  
    channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, channel_id)
);

CREATE TABLE IF NOT EXISTS playlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,   
    name VARCHAR(255) NOT NULL,
    description TEXT,
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'unlisted')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_playlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,   
    playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, playlist_id)
);

CREATE TABLE IF NOT EXISTS playlist_videos (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
    position INTEGER,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(playlist_id, video_id)
);

CREATE TABLE video_snapshots (
    id          SERIAL PRIMARY KEY,
    video_id    INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    views       INTEGER DEFAULT 0,
    likes       INTEGER DEFAULT 0,
    dislikes    INTEGER DEFAULT 0,
    saves       INTEGER DEFAULT 0,      
    comments    INTEGER DEFAULT 0,       
    snapshot_at TIMESTAMP DEFAULT NOW(), 
    period      VARCHAR(10) DEFAULT 'daily' CHECK (period IN ('hourly', 'daily')),
    UNIQUE(video_id, snapshot_at, period)
);

-- index for fast access

CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_by ON videos(created_by);
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_video_id ON interactions(video_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_video_id ON watch_history(video_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_channel_id ON subscriptions(channel_id);
CREATE INDEX IF NOT EXISTS idx_playlist_videos_playlist_id ON playlist_videos(playlist_id);
CREATE INDEX IF NOT EXISTS idx_videos_visibility ON videos(visibility);
CREATE INDEX IF NOT EXISTS idx_videos_published_at ON videos(published_at DESC);

-- triggers

CREATE OR REPLACE FUNCTION create_default_channel()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO channels (user_id, name, banner)
  VALUES (
    NEW.id,
    NEW.name,
    '/uploads/banners/default-banner.png'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_channel ON users;
CREATE TRIGGER auto_create_channel
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_channel();




CREATE OR REPLACE FUNCTION update_channel_subs_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE channels SET subs_count = subs_count + 1 WHERE id = NEW.channel_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE channels SET subs_count = GREATEST(0, subs_count - 1) WHERE id = OLD.channel_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_channel_subs_count
AFTER INSERT OR DELETE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_channel_subs_count();



CREATE OR REPLACE FUNCTION update_channel_video_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE channels SET video_count = video_count + 1 WHERE id = NEW.channel_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE channels SET video_count = GREATEST(0, video_count - 1) WHERE id = OLD.channel_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_channel_video_count
AFTER INSERT OR DELETE ON videos
FOR EACH ROW EXECUTE FUNCTION update_channel_video_count();



-- ✅ FIXED: now updates videos.views which actually exists
CREATE OR REPLACE FUNCTION increment_video_views()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE videos SET views = views + 1 WHERE id = NEW.video_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_video_views
AFTER INSERT ON watch_history
FOR EACH ROW EXECUTE FUNCTION increment_video_views();



CREATE OR REPLACE FUNCTION update_channel_total_views()
RETURNS TRIGGER AS $$
DECLARE
    v_channel_id INTEGER;
BEGIN
    SELECT channel_id INTO v_channel_id FROM videos WHERE id = NEW.video_id;
    UPDATE channels
    SET total_views = (
        SELECT COALESCE(SUM(views), 0) FROM videos WHERE channel_id = v_channel_id
    )
    WHERE id = v_channel_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_channel_total_views
AFTER INSERT ON watch_history
FOR EACH ROW EXECUTE FUNCTION update_channel_total_views();



CREATE OR REPLACE FUNCTION update_video_interactions()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.interaction_type = 'like' THEN
            UPDATE videos SET likes = likes + 1 WHERE id = NEW.video_id;
        ELSIF NEW.interaction_type = 'dislike' THEN
            UPDATE videos SET dislikes = dislikes + 1 WHERE id = NEW.video_id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.interaction_type = 'like' THEN
            UPDATE videos SET likes = GREATEST(0, likes - 1) WHERE id = OLD.video_id;
        ELSIF OLD.interaction_type = 'dislike' THEN
            UPDATE videos SET dislikes = GREATEST(0, dislikes - 1) WHERE id = OLD.video_id;
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.interaction_type = 'like' AND NEW.interaction_type = 'dislike' THEN
            UPDATE videos SET likes = GREATEST(0, likes - 1), dislikes = dislikes + 1 WHERE id = NEW.video_id;
        ELSIF OLD.interaction_type = 'dislike' AND NEW.interaction_type = 'like' THEN
            UPDATE videos SET likes = likes + 1, dislikes = GREATEST(0, dislikes - 1) WHERE id = NEW.video_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_video_interactions
AFTER INSERT OR DELETE OR UPDATE ON interactions
FOR EACH ROW EXECUTE FUNCTION update_video_interactions();



CREATE OR REPLACE FUNCTION update_video_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE videos SET comment_count = comment_count + 1 WHERE id = NEW.video_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE videos SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.video_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_video_comment_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_video_comment_count();


-- Function to create default playlists on user registration
CREATE OR REPLACE FUNCTION create_default_playlists()
RETURNS TRIGGER AS $$
BEGIN
    -- Liked Videos playlist
    INSERT INTO playlists (user_id, name, description, visibility)
    VALUES (
        NEW.id,
        'Liked Videos',
        'Videos you have liked',
        'private'
    );

    -- Watch Later playlist
    INSERT INTO playlists (user_id, name, description, visibility)
    VALUES (
        NEW.id,
        'Watch Later',
        'Videos to watch later',
        'private'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_playlists
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_playlists();

CREATE OR REPLACE FUNCTION add_to_liked_playlist()
RETURNS TRIGGER AS $$
DECLARE
    liked_playlist_id INTEGER;
    vid_position INTEGER;
BEGIN
    IF NEW.interaction_type = 'like' THEN
        -- get user's liked videos playlist
        SELECT id INTO liked_playlist_id
        FROM playlists
        WHERE user_id = NEW.user_id AND name = 'Liked Videos'
        LIMIT 1;

        IF liked_playlist_id IS NOT NULL THEN
            -- get next position
            SELECT COALESCE(MAX(position), 0) + 1 INTO vid_position
            FROM playlist_videos
            WHERE playlist_id = liked_playlist_id;

            -- add video to playlist (ignore if already there)
            INSERT INTO playlist_videos (playlist_id, video_id, position)
            VALUES (liked_playlist_id, NEW.video_id, vid_position)
            ON CONFLICT (playlist_id, video_id) DO NOTHING;
        END IF;

    ELSIF TG_OP = 'DELETE' AND OLD.interaction_type = 'like' THEN
        -- remove from liked playlist when unliked
        SELECT id INTO liked_playlist_id
        FROM playlists
        WHERE user_id = OLD.user_id AND name = 'Liked Videos'
        LIMIT 1;

        IF liked_playlist_id IS NOT NULL THEN
            DELETE FROM playlist_videos
            WHERE playlist_id = liked_playlist_id
              AND video_id = OLD.video_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_to_liked_playlist
AFTER INSERT OR DELETE ON interactions
FOR EACH ROW
EXECUTE FUNCTION add_to_liked_playlist();


CREATE OR REPLACE FUNCTION update_comment_interactions()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.type = 'like' THEN
            UPDATE comments SET likes = likes + 1 WHERE id = NEW.comment_id;
        ELSIF NEW.type = 'dislike' THEN
            UPDATE comments SET dislikes = dislikes + 1 WHERE id = NEW.comment_id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.type = 'like' THEN
            UPDATE comments SET likes = GREATEST(0, likes - 1) WHERE id = OLD.comment_id;
        ELSIF OLD.type = 'dislike' THEN
            UPDATE comments SET dislikes = GREATEST(0, dislikes - 1) WHERE id = OLD.comment_id;
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- switching like ↔ dislike
        IF OLD.type = 'like' AND NEW.type = 'dislike' THEN
            UPDATE comments SET likes = GREATEST(0, likes - 1), dislikes = dislikes + 1 WHERE id = NEW.comment_id;
        ELSIF OLD.type = 'dislike' AND NEW.type = 'like' THEN
            UPDATE comments SET likes = likes + 1, dislikes = GREATEST(0, dislikes - 1) WHERE id = NEW.comment_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_interactions
AFTER INSERT OR DELETE OR UPDATE ON comment_interactions
FOR EACH ROW EXECUTE FUNCTION update_comment_interactions();


-- ============================================================================
-- PART 4: UTILITY FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION repair_all_counts()
RETURNS void AS $$
BEGIN
    UPDATE channels c SET subs_count = (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id);
    UPDATE channels c SET video_count = (SELECT COUNT(*) FROM videos WHERE channel_id = c.id);
    UPDATE videos v SET views = (SELECT COUNT(*) FROM watch_history WHERE video_id = v.id);
    UPDATE videos v SET likes = (SELECT COUNT(*) FROM interactions WHERE video_id = v.id AND interaction_type = 'like');
    UPDATE videos v SET dislikes = (SELECT COUNT(*) FROM interactions WHERE video_id = v.id AND interaction_type = 'dislike');
    UPDATE videos v SET comment_count = (SELECT COUNT(*) FROM comments WHERE video_id = v.id);
    UPDATE channels c SET total_views = (SELECT COALESCE(SUM(views), 0) FROM videos WHERE channel_id = c.id);
    RAISE NOTICE 'All counts repaired successfully';
END;
$$ LANGUAGE plpgsql;
