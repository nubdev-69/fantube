# Fantube

A full-stack YouTube clone. Supports video upload, playback, channel management, comments, subscriptions, OAuth login, and a personalised recommendation feed.

---

## Tech Stack

| Layer     | Technology                                               |
|-----------|----------------------------------------------------------|
| Frontend  | React 19, Vite 7, React Router DOM v7, Plain CSS Modules |
| Backend   | Node.js, Express 5, PostgreSQL 16, Passport.js           |
| Auth      | JWT (7-day), Google OAuth 2.0, Twitter OAuth 1.0a        |
| Uploads   | Multer — local disk storage (videos, thumbnails, avatars)|
| Jobs      | node-cron — hourly/daily snapshot aggregation            |
| Validation| Joi                                                      |

---

## Project Structure

```
fantube/
├── frontend/                   React + Vite SPA
│   ├── src/
│   │   ├── main.jsx            Entry point
│   │   ├── App.jsx             Root layout + routes
│   │   ├── context/
│   │   │   └── AuthContext.jsx Global auth state
│   │   ├── services/
│   │   │   └── auth.js         AuthService (login/register/logout)
│   │   ├── assets/utils/
│   │   │   └── format.js       formatDuration, formatViews, timeAgo
│   │   └── components/
│   │       ├── navbar/         Navbar, ProfileSidebar, CreateModal
│   │       ├── sidebar/        Sidebar
│   │       ├── vid-menu/       VideoMenu (infinite scroll), VideoCard
│   │       ├── video/          Watch, Comment, Comments, SuggestedVideoCard
│   │       ├── channel/        ChannelPage, Home, Videos, Search
│   │       └── pages/
│   │           ├── login/      LoginPage (email + OAuth)
│   │           ├── account/    Profile, ChangePassword
│   │           ├── upload/     UploadPage, EditPage, ChannelCustomize
│   │           ├── studio/     StudioPage (dashboard + content tab)
│   │           ├── explore/    Explore (category browse)
│   │           ├── search/     SearchPage
│   │           ├── subscription/ Subscription feed
│   │           ├── you/        YouPage (history, playlists, liked)
│   │           ├── OAuth/      OAuthCallback
│   │           └── error/      ErrorPage
│   └── package.json
│
└── backend/                    Express API + PostgreSQL
    └── src/
        ├── server.js           App bootstrap
        ├── config/
        │   └── passport.js     Google + Twitter strategies
        ├── database/
        │   ├── config/
        │   │   └── database.js pg connection pool
        │   └── migration/
        │       ├── schema.sql  All tables, indexes, triggers
        │       └── run-migration.js
        ├── middleware/
        │   ├── auth.js         JWT authenticate / optionalAuth
        │   ├── upload.js       Multer configs (video, thumbnail, pfp, banner)
        │   ├── validation.js   Joi validators
        │   └── errorHandler.js notFound + global error handler
        ├── routes/             authRoutes, videoRoutes, channelRoutes,
        │                       commentRoutes, userRoutes
        ├── controllers/        authController, videoController,
        │                       channelController, commentController,
        │                       userController
        ├── models/             User, Video, Channel, Comment
        ├── jobs/
        │   ├── index.js        Cron schedule
        │   └── snapshotJobs.js Hourly / daily snapshot aggregation
        └── utils/
        │   └── helpers.js      generateHandle
        │
        └── uploads/
```

---

## Features

### Video
- Upload with real-time XHR progress bar
- Playback with keyboard shortcuts (`Space`/`K` play-pause, `J`/`L` ±5s, `F` fullscreen, `M` mute)
- Edit title, description, thumbnail, tags, category, visibility, comments toggle
- Delete (removes files from disk + database)
- Watch duration tracking via `navigator.sendBeacon` on page unload
- Visibility: `public` · `unlisted` · `private`

### Recommendation Engine
The home feed uses a contextual bandit approach in a single PostgreSQL CTE:

- **Cold start** — category-diverse trending score when user has no history
- **Personalised** — liked-tag affinity, subscribed channel boost, category diversity penalty, UCB-style exploration jitter (±20%)
- **Trending** — per-category engagement score (likes × 3 + comments × 2 + views × 0.4) with recency decay
- **Discovery** — randomised score for unseen categories
- **Subscribed** — recency-weighted videos from followed channels
- Interleaved 4-slot ordering: `personalized → trending → subscribed → discovery`

Suggested sidebar videos (watch page) use the same signal set in a bucketed `related / subscribed / discovery` pool.

### Channels
- Auto-created on user registration (PostgreSQL trigger)
- Customise name, banner, description, social links (up to 5), featured video
- Home tab: featured video + horizontally scrollable playlist sections
- Videos tab, in-channel search tab
- Subscribe / Unsubscribe with live count (trigger-maintained)

### Comments
- Nested replies (one level deep)
- Like / dislike on comments with optimistic UI
- Delete own comments

### Auth
- Email + password with bcrypt (min 6 chars)
- Google OAuth 2.0 — profile picture downloaded locally at higher resolution
- Twitter OAuth 1.0a — full-size avatar downloaded locally
- JWT — 7-day expiry, stored in `localStorage`
- OAuth users can set a password via the Change Password page

### User Data
- Watch history with completion tracking; clear-all supported
- Liked videos auto-added to a `Liked Videos` playlist (trigger)
- `Watch Later` playlist (auto-created on registration)
- Subscription feed with per-channel filter

### Creator Studio
- Channel dashboard: total views, subscribers, video count
- Content table: search, edit, play, delete with confirmation modal
- Channel customisation from studio

### Background Jobs (node-cron)
| Job | Schedule | Purpose |
|-----|----------|---------|
| Hourly snapshot | Every hour | Captures per-video engagement for last 7 days of videos |
| Daily snapshot | Midnight UTC | Full catalogue daily engagement snapshot |
| Cleanup | 1 AM UTC | Removes hourly snapshots > 7 days, daily > 1 year |

### Database Triggers (PostgreSQL)
All counters are trigger-maintained — no application-level update needed:

| Trigger | Effect |
|---------|--------|
| `auto_create_channel` | Creates channel row on user insert |
| `create_default_playlists` | Creates Liked Videos + Watch Later on user insert |
| `trigger_increment_video_views` | Increments `videos.views` on watch_history insert |
| `trigger_update_channel_subs_count` | Keeps `channels.subs_count` accurate |
| `trigger_update_channel_video_count` | Keeps `channels.video_count` accurate |
| `trigger_update_video_interactions` | Syncs `likes` / `dislikes` on interaction change |
| `trigger_update_video_comment_count` | Keeps `videos.comment_count` accurate |
| `trigger_add_to_liked_playlist` | Auto-adds / removes liked video from playlist |
| `trigger_update_comment_interactions` | Syncs comment likes / dislikes |

---

## Database Schema (summary)

```
users ──────────────┐
  id, user_id,      │ 1:1
  name, email,      ▼
  password, pfp   channels ──────────────────────┐
                    id, user_id, name, banner,    │ 1:N
                    description, links,           ▼
                    subs_count, video_count     videos
                    featured_video (FK→videos)    id, video_id, title,
                                                  thumbnail, video_url,
                                                  channel_id, created_by,
                                                  visibility, views,
                                                  likes, dislikes

video_meta          interactions       watch_history
  video_id (1:1)    user_id, video_id  user_id, video_id
  duration,         interaction_type   watch_duration, completed
  tags[], category  (like/dislike/save)

comments            comment_interactions   subscriptions
  video_id,         video_id, user_id,     user_id, channel_id
  reply_id,         comment_id, type
  likes, dislikes

playlists ── playlist_videos    video_snapshots
  user_id,     playlist_id,       video_id, period,
  name,        video_id,          views, likes, dislikes,
  visibility   position           snapshot_at
```

---

## Key API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/google            → OAuth redirect
GET    /api/auth/twitter           → OAuth redirect

GET    /api/videos                 Home feed (personalised)
GET    /api/videos/explore         Category browse
GET    /api/videos/search?q=       Global search
POST   /api/videos/upload          Upload video (multipart)
POST   /api/videos/update/:id      Edit video metadata
DELETE /api/videos/:id             Delete video
GET    /api/videos/:id/suggested   Sidebar recommendations
POST   /api/videos/:id/watch       Record / update view session
POST   /api/videos/:id/interaction Like / dislike

GET    /api/channels/:id           Channel public info
PUT    /api/channels/:id           Update channel
GET    /api/channels/:id/videos    Channel video list
GET    /api/channels/:id/home      Featured video + playlists
POST   /api/channels/:id/subscribe Toggle subscribe
GET    /api/channels/studio/stats  Creator dashboard stats

POST   /api/videos/:id/comments    Post comment
DELETE /api/comments/:id           Delete comment

GET    /api/user/history           Watch history
GET    /api/user/subscriptions     Subscription list
GET    /api/user/subscriptions/feed Latest videos from subscriptions
GET    /api/user/liked             Liked videos
GET    /api/user/playlists         User playlists
```

---

## Environment Variables

**Backend** (`.env` in `backend/`):

```env
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=youtube_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

**Frontend** (`.env` in `frontend/`):

```env
REACT_APP_API_URL=http://localhost:5001
VITE_UPLOADS_URL=http://localhost:5001
```

---

## Quick Start

```bash
# 1. Create database
createdb youtube_db

# 2. Backend
cd backend
npm install
npm run migrate      # runs schema.sql
npm run dev          # nodemon on :5001

# 3. Frontend
cd frontend
npm install
npm run dev          # Vite on :5173
```

Open `http://localhost:5173`.

---

## Scripts

**Backend**
```
npm run dev        nodemon src/server.js
npm start          node src/server.js
npm run migrate    run schema.sql against the database
```

**Frontend**
```
npm run dev        Vite dev server with HMR
npm run build      Production build → dist/
npm run preview    Preview production build
npm run lint       ESLint
```

---

## Upload Limits

| Type      | Max size | Formats                      |
|-----------|----------|------------------------------|
| Video     | 500 MB   | mp4, mov, avi, mkv, webm     |
| Thumbnail | 5 MB     | jpg, jpeg, png, gif, webp    |
| Avatar    | 5 MB     | jpg, jpeg, png, gif, webp    |
| Banner    | 500 MB   | jpg, jpeg, png, gif, webp    |

Files are stored on disk under `backend/src/uploads/` and served at `/uploads/*`.

---

## Frontend Routes

| Path | Component |
|------|-----------|
| `/` | VideoMenu — personalised home feed |
| `/watch/:videoId` | Watch — video player |
| `/channel/:channelId` | ChannelPage |
| `/channel/:channelId/customize` | ChannelCustomize |
| `/upload` | UploadPage |
| `/video/:videoId/edit` | EditPage |
| `/studio` | StudioPage |
| `/search?q=` | SearchPage |
| `/explore` | Explore |
| `/subscriptions` | Subscription feed |
| `/you` | YouPage — history, playlists, liked |
| `/profile` | Profile |
| `/account/password` | ChangePassword |
| `/login` | LoginPage |
| `/oauth/callback` | OAuthCallback |

---

## Licence

MIT — built for academic and learning purposes.

Built by NubDev❤️‍🔥