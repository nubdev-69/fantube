import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Explore.css';
import { formatViews, timeAgo, formatDuration } from '../../../assets/utils/format';
const API = 'http://localhost:5001';

const CATEGORIES = ['gaming', 'education', 'entertainment', 'music', 'sports', 'technology', 'vlogs'];

export default function Explore() {
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
          document.title = "Explore - FanTube";
      }, []);

    useEffect(() => {
        const fetchExplore = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const url = selectedCategory
                    ? `${API}/api/videos/explore?category=${encodeURIComponent(selectedCategory)}`
                    : `${API}/api/videos/explore`;

                const res = await fetch(url, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                const data = await res.json();
                if (res.ok) setSections(data.sections || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchExplore();
    }, [selectedCategory]);

    // All tab renders as flat grid, category tab renders with header
    const isAllTab = !selectedCategory;
    const flatVideos = isAllTab
        ? sections.flatMap(s => s.videos)
        : sections.flatMap(s => s.videos);

    return (
        <div className="explore-page">
            <div className="explore-tags">
                <button
                    className={`explore-tag ${!selectedCategory ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(null)}
                >
                    All
                </button>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        className={`explore-tag ${selectedCategory === cat ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                    >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="explore-loading">Loading...</div>
            ) : flatVideos.length === 0 ? (
                <div className="explore-empty">No videos found.</div>
            ) : (
                <>
                    {selectedCategory && (
                        <h2 className="explore-category-title">
                            {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
                        </h2>
                    )}
                    <div className="explore-grid">
                        {flatVideos.map(video => (
                            <VideoCard
                                key={video.videoId}
                                video={video}
                                onClick={() => navigate(`/watch/${video.videoId}`)}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function VideoCard({ video, onClick }) {
    return (
        <div className="explore-card" onClick={onClick}>
            <div className="explore-card-thumb">
                <img
                    src={video.thumbnail ? `${API}${video.thumbnail}` : '/default-thumb.png'}
                    alt={video.title}
                />
                <span className="explore-card-duration">{formatDuration(video.duration)}</span>
            </div>
            <div className="explore-card-info">
                <div className="explore-card-avatar">
                    <img
                        src={video.pfp ? `${API}${video.pfp}` : '/default-avatar.png'}
                        alt={video.channel}
                    />
                </div>
                <div className="explore-card-text">
                    <p className="explore-card-title">{video.title}</p>
                    <p className="explore-card-channel">{video.channel}</p>
                    <p className="explore-card-meta">
                        {formatViews(video.views)} views • {timeAgo(video.publishedAt)}
                    </p>
                </div>
            </div>
        </div>
    );
}