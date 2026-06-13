import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import './YouPage.css';
import { formatViews, timeAgo, formatDuration } from '../../../assets/utils/format';

const API = 'http://localhost:5001';

export default function YouPage() {
    useEffect(() => {
          document.title = "FanTube";
      }, []);
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('history');
    const [history, setHistory] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [likedVideos, setLikedVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        const fetchAll = async () => {
            setLoading(true);
            try {
                const [histRes, plRes, likedRes] = await Promise.all([
                    fetch(`${API}/api/user/history`,   { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${API}/api/user/playlists`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${API}/api/user/liked`,     { headers: { Authorization: `Bearer ${token}` } })
                ]);

                const [histData, plData, likedData] = await Promise.all([
                    histRes.json(), plRes.json(), likedRes.json()
                ]);

                if (histRes.ok)  setHistory(histData.history     || []);
                if (plRes.ok)    setPlaylists(plData.playlists   || []);
                if (likedRes.ok) setLikedVideos(likedData.videos || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, []);

    const clearHistory = async () => {
        const token = localStorage.getItem('token');
        await fetch(`${API}/api/user/history`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        setHistory([]);
    };

    const tabs = [
        { id: 'history',   label: 'History' },
        { id: 'playlists', label: 'Playlists' },
        { id: 'liked',     label: 'Liked Videos' },
    ];

    return (
        <div className="you-page">
            {/* Profile header */}
            <div className="you-header">
                <img
                    src={user?.pfp ? `${API}${user.pfp}` : '/default-avatar.png'}
                    alt={user?.name}
                    className="you-avatar"
                    onClick={() => navigate(`/channel/${user?.userId}`)}
                />
                <div className="you-header-info">
                    <h1 className="you-name">{user?.name}</h1>
                    <p className="you-handle">@{user?.userId}</p>
                    <div className="you-header-links">
                        <button className="you-link-btn" onClick={() => navigate(`/channel/${user?.userId}`)}>
                            View channel
                        </button>
                        <button className="you-link-btn" onClick={() => navigate('/profile')}>
                            Manage account
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="you-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`you-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                        {tab.id === 'history'   && history.length > 0     && <span className="you-tab-count">{history.length}</span>}
                        {tab.id === 'liked'     && likedVideos.length > 0 && <span className="you-tab-count">{likedVideos.length}</span>}
                        {tab.id === 'playlists' && playlists.length > 0   && <span className="you-tab-count">{playlists.length}</span>}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="you-loading">Loading...</div>
            ) : (
                <div className="you-content">
                    {activeTab === 'history' && (
                        <HistoryTab
                            history={history}
                            navigate={navigate}
                            onClear={clearHistory}
                        />
                    )}
                    {activeTab === 'playlists' && (
                        <PlaylistsTab playlists={playlists} navigate={navigate} setActiveTab={setActiveTab}/>
                    )}
                    {activeTab === 'liked' && (
                        <LikedTab videos={likedVideos} navigate={navigate} />
                    )}
                </div>
            )}
        </div>
    );
}

// ── HISTORY TAB ──
function HistoryTab({ history, navigate, onClear }) {
    if (history.length === 0) return (
        <div className="you-empty">
            <p>No watch history yet.</p>
        </div>
    );

    return (
        <>
            <div className="you-section-header">
                <h2>Watch History</h2>
                <button className="you-clear-btn" onClick={onClear}>Clear all</button>
            </div>
            <div className="you-video-list">
                {history.map(video => (
                    <VideoRow key={video.videoId} video={video} navigate={navigate}>
                        <span className="you-watched-at">Watched {timeAgo(video.watchedAt)}</span>
                        {video.completed && <span className="you-completed-badge">✓ Watched</span>}
                    </VideoRow>
                ))}
            </div>
        </>
    );
}

// ── PLAYLISTS TAB ──
function PlaylistsTab({ playlists, navigate, setActiveTab}) {
    if (playlists.length === 0) return (
        <div className="you-empty"><p>No playlists yet.</p></div>
    );

    return (
        <>
            <div className="you-section-header">
                <h2>Your Playlists</h2>
            </div>
            <div className="you-playlists-grid">
                {playlists.map(pl => (
                    <div
                        key={pl.id}
                        className="you-playlist-card"
                        // onClick={() => navigate(`/playlist/${pl.id}`)}
                        onClick={()=> setActiveTab('liked')}
                    >
                        <div className="you-playlist-thumb">
                            {pl.cover ? (
                                <img src={`${API}${pl.cover}`} alt={pl.name} />
                            ) : (
                                <div className="you-playlist-thumb-empty">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5">
                                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                                        <path d="M3 9h18M9 21V9"/>
                                    </svg>
                                </div>
                            )}
                            <span className="you-playlist-count">{pl.videoCount} videos</span>
                            {pl.visibility !== 'public' && (
                                <span className="you-playlist-private">
                                    {pl.visibility === 'private' ? '🔒' : '🔗'}
                                </span>
                            )}
                        </div>
                        <div className="you-playlist-info">
                            <p className="you-playlist-name">{pl.name}</p>
                            {pl.isDefault && <span className="you-default-badge">Default</span>}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

// ── LIKED TAB ──
function LikedTab({ videos, navigate }) {
    if (videos.length === 0) return (
        <div className="you-empty"><p>No liked videos yet.</p></div>
    );

    return (
        <>
            <div className="you-section-header">
                <h2>Liked Videos</h2>
                <span className="you-count">{videos.length} videos</span>
            </div>
            <div className="you-video-list">
                {videos.map(video => (
                    <VideoRow key={video.videoId} video={video} navigate={navigate}>
                        <span className="you-watched-at">Liked {timeAgo(video.likedAt)}</span>
                    </VideoRow>
                ))}
            </div>
        </>
    );
}

// ── SHARED VIDEO ROW ──
function VideoRow({ video, navigate, children }) {
    return (
        <div className="you-video-row" onClick={() => navigate(`/watch/${video.videoId}`)}>
            <div className="you-video-thumb">
                <img
                    src={video.thumbnail ? `${API}${video.thumbnail}` : '/default-thumb.png'}
                    alt={video.title}
                />
                <span className="you-video-duration">{formatDuration(video.duration)}</span>
            </div>
            <div className="you-video-info">
                <p className="you-video-title">{video.title}</p>
                <p className="you-video-channel">{video.channel}</p>
                <p className="you-video-meta">
                    {formatViews(video.views)} views • {timeAgo(video.publishedAt)}
                </p>
                {children}
            </div>
            <img
                src={video.pfp ? `${API}${video.pfp}` : '/default-avatar.png'}
                alt={video.channel}
                className="you-video-pfp"
                onClick={e => { e.stopPropagation(); navigate(`/channel/${video.handle}`); }}
            />
        </div>
    );
}