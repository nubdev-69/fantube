import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Search.css';
import { formatViews, timeAgo, formatDuration } from '../../assets/utils/format';

const API = 'http://localhost:5001';

export default function Search() {
    const { channelId } = useParams();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [videos, setVideos] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    // focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSearch = async (q) => {
        if (!q.trim()) {
            setVideos([]);
            setPlaylists([]);
            setSearched(false);
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${API}/api/channels/${channelId}/search?q=${encodeURIComponent(q)}`,
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                }
            );
            const data = await res.json();
            if (res.ok) {
                setVideos(data.videos   || []);
                setPlaylists(data.playlists || []);
                setSearched(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const val = e.target.value;
        setQuery(val);

        // debounce — wait 400ms after typing stops
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            handleSearch(val);
        }, 400);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            clearTimeout(debounceRef.current);
            handleSearch(query);
        }
    };

    const total = videos.length + playlists.length;

    return (
        <div className="cs-page">
            {/* Search bar */}
            <div className="cs-search-bar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#606060" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                    ref={inputRef}
                    className="cs-input"
                    type="text"
                    placeholder="Search this channel"
                    value={query}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                />
                {query && (
                    <button
                        className="cs-clear"
                        onClick={() => {
                            setQuery('');
                            setVideos([]);
                            setPlaylists([]);
                            setSearched(false);
                            inputRef.current?.focus();
                        }}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Results */}
            {loading && <div className="cs-loading">Searching...</div>}

            {!loading && searched && (
                <p className="cs-result-count">
                    {total === 0
                        ? `No results for "${query}"`
                        : `${total} result${total !== 1 ? 's' : ''} for "${query}"`
                    }
                </p>
            )}

            {!loading && !searched && (
                <div className="cs-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <p>Search for videos or playlists on this channel</p>
                </div>
            )}

            {!loading && searched && total === 0 && (
                <div className="cs-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <p>No videos or playlists found for "{query}"</p>
                </div>
            )}

            {/* Videos section */}
            {!loading && videos.length > 0 && (
                <div className="cs-section">
                    <h3 className="cs-section-title">
                        Videos
                        <span className="cs-section-count">{videos.length}</span>
                    </h3>
                    <div className="cs-video-list">
                        {videos.map(video => (
                            <div
                                key={video.videoId}
                                className="cs-video-row"
                                onClick={() => navigate(`/watch/${video.videoId}`)}
                            >
                                <div className="cs-video-thumb">
                                    <img
                                        src={video.thumbnail ? `${API}${video.thumbnail}` : '/default-thumb.png'}
                                        alt={video.title}
                                    />
                                    <span className="cs-duration">{formatDuration(video.duration)}</span>
                                </div>
                                <div className="cs-video-info">
                                    <p className="cs-video-title">{video.title}</p>
                                    <p className="cs-video-meta">
                                        {formatViews(video.views)} views • {timeAgo(video.publishedAt)}
                                    </p>
                                    {video.visibility !== 'public' && (
                                        <span className={`cs-visibility cs-vis-${video.visibility}`}>
                                            {video.visibility === 'private'  ? '🔒 Private'  : '🔗 Unlisted'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Playlists section */}
            {!loading && playlists.length > 0 && (
                <div className="cs-section">
                    <h3 className="cs-section-title">
                        Playlists
                        <span className="cs-section-count">{playlists.length}</span>
                    </h3>
                    <div className="cs-playlist-grid">
                        {playlists.map(pl => (
                            <div
                                key={pl.id}
                                className="cs-playlist-card"
                                onClick={() => navigate(`/playlist/${pl.id}`)}
                            >
                                <div className="cs-playlist-thumb">
                                    {pl.cover ? (
                                        <img src={`${API}${pl.cover}`} alt={pl.name} />
                                    ) : (
                                        <div className="cs-playlist-thumb-empty">
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5">
                                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                                <path d="M3 9h18M9 21V9"/>
                                            </svg>
                                        </div>
                                    )}
                                    <span className="cs-playlist-count">{pl.videoCount} videos</span>
                                    {pl.visibility !== 'public' && (
                                        <span className="cs-playlist-private">
                                            {pl.visibility === 'private' ? '🔒' : '🔗'}
                                        </span>
                                    )}
                                </div>
                                <div className="cs-playlist-info">
                                    <p className="cs-playlist-name">{pl.name}</p>
                                    {pl.description && (
                                        <p className="cs-playlist-desc">{pl.description}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}