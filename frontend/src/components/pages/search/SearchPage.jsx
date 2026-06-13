import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './SearchPage.css';
import { formatViews, timeAgo, formatDuration } from '../../../assets/utils/format';
const API = 'http://localhost:5001';

const FILTERS = [
    { id: 'all',      label: 'All' },
    { id: 'videos',   label: 'Videos' },
    { id: 'channels', label: 'Channels' },
];

const SORT_OPTIONS = [
    { id: 'relevance', label: 'Relevance' },
    { id: 'date',      label: 'Upload date' },
    { id: 'views',     label: 'View count' },
    { id: 'rating',    label: 'Rating' },
];

export default function SearchPage() {

    useEffect(() => {
          document.title = "Search - FanTube";
      }, []);

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const q      = searchParams.get('q')      || '';
    const filter = searchParams.get('filter') || 'all';
    const sort   = searchParams.get('sort')   || 'relevance';

    const [videos,   setVideos]   = useState([]);
    const [channels, setChannels] = useState([]);
    const [loading,  setLoading]  = useState(false);

    useEffect(() => {
        if (!q) return;

        const fetchResults = async () => {
            setLoading(true);
            try {
                const res = await fetch(
                    `${API}/api/videos/search?q=${encodeURIComponent(q)}&filter=${filter}&sort=${sort}`
                );
                const data = await res.json();
                if (res.ok) {
                    setVideos(data.videos     || []);
                    setChannels(data.channels || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [q, filter, sort]);

    const setFilter = (f) => setSearchParams({ q, filter: f, sort });
    const setSort   = (s) => setSearchParams({ q, filter, sort: s });

    const total = videos.length + channels.length;

    return (
        <div className="sp-page">
            {/* Filter bar */}
            <div className="sp-filter-bar">
                <div className="sp-filters">
                    {FILTERS.map(f => (
                        <button
                            key={f.id}
                            className={`sp-filter-btn ${filter === f.id ? 'active' : ''}`}
                            onClick={() => setFilter(f.id)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Sort — only show for videos */}
                {(filter === 'all' || filter === 'videos') && (
                    <div className="sp-sort">
                        <span className="sp-sort-label">Sort by</span>
                        <select
                            className="sp-sort-select"
                            value={sort}
                            onChange={e => setSort(e.target.value)}
                        >
                            {SORT_OPTIONS.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Results info */}
            {!loading && q && (
                <p className="sp-result-info">
                    {total === 0
                        ? `No results for "${q}"`
                        : `About ${total} result${total !== 1 ? 's' : ''} for "${q}"`
                    }
                </p>
            )}

            {loading && <div className="sp-loading">Searching...</div>}

            {!loading && !q && (
                <div className="sp-empty">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <p>Search for videos and channels</p>
                </div>
            )}

            {!loading && q && total === 0 && (
                <div className="sp-empty">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <p>No results found for "{q}"</p>
                    <span>Try different keywords or remove filters</span>
                </div>
            )}

            <div className="sp-results">
                {/* Channels section */}
                {!loading && channels.length > 0 && (
                    <div className="sp-section">
                        {filter === 'all' && (
                            <h3 className="sp-section-title">
                                Channels
                                <span className="sp-section-count">{channels.length}</span>
                            </h3>
                        )}
                        <div className="sp-channels-list">
                            {channels.map(ch => (
                                <div
                                    key={ch.id}
                                    className="sp-channel-card"
                                    onClick={() => navigate(`/channel/${ch.handle}`)}
                                >
                                    <img
                                        src={ch.pfp ? `${API}${ch.pfp}` : '/default-avatar.png'}
                                        alt={ch.name}
                                        className="sp-channel-pfp"
                                    />
                                    <div className="sp-channel-info">
                                        <p className="sp-channel-name">{ch.name}</p>
                                        <p className="sp-channel-handle">@{ch.handle}</p>
                                        <p className="sp-channel-stats">
                                            {formatViews(ch.subsCount)} subscribers
                                            {ch.videoCount > 0 && ` • ${ch.videoCount} videos`}
                                        </p>
                                        {ch.description && (
                                            <p className="sp-channel-desc">{ch.description}</p>
                                        )}
                                    </div>
                                    <button
                                        className="sp-sub-btn"
                                        onClick={e => { e.stopPropagation(); navigate(`/channel/${ch.handle}`); }}
                                    >
                                        View Channel
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Videos section */}
                {!loading && videos.length > 0 && (
                    <div className="sp-section">
                        {filter === 'all' && (
                            <h3 className="sp-section-title">
                                Videos
                                <span className="sp-section-count">{videos.length}</span>
                            </h3>
                        )}
                        <div className="sp-video-list">
                            {videos.map(video => (
                                <div
                                    key={video.id}
                                    className="sp-video-row"
                                    onClick={() => navigate(`/watch/${video.url}`)}
                                >
                                    <div className="sp-video-thumb">
                                        <img
                                            src={video.thumbnail ? `${API}${video.thumbnail}` : '/default-thumb.png'}
                                            alt={video.title}
                                        />
                                        <span className="sp-duration">{formatDuration(video.duration)}</span>
                                    </div>
                                    <div className="sp-video-info">
                                        <p className="sp-video-title">{video.title}</p>
                                        <p className="sp-video-meta">
                                            {formatViews(video.views)} views • {timeAgo(video.publishedAt)}
                                        </p>
                                        <div
                                            className="sp-video-channel"
                                            onClick={e => { e.stopPropagation(); navigate(`/channel/${video.handle}`); }}
                                        >
                                            <img
                                                src={video.pfp ? `${API}${video.pfp}` : '/default-avatar.png'}
                                                alt={video.channel}
                                                className="sp-video-pfp"
                                            />
                                            <span>{video.channel}</span>
                                        </div>
                                        {video.description && (
                                            <p className="sp-video-desc">{video.description}</p>
                                        )}
                                        {video.category && (
                                            <span className="sp-video-category">{video.category}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}