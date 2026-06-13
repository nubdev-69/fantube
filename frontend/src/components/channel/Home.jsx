import { useState, useRef, useEffect } from 'react';
import './Home.css';
import { useParams, useNavigate } from 'react-router-dom';
import { formatViews, timeAgo, formatDuration } from '../../assets/utils/format';

const API = 'http://localhost:5001';

export default function Home() {
    const { channelId } = useParams();
    const navigate = useNavigate();
    const [featuredVideo, setFeaturedVideo] = useState(null);
    const [playlists, setPlaylists] = useState([]);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const playlistRefs = useRef({});

    useEffect(() => {
        const token = localStorage.getItem('token');
        const homePageDetails = async () => {
            const res = await fetch(`${API}/api/channels/${channelId}/home`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setFeaturedVideo(data.featuredVideo || null);
                setPlaylists(data.playlists || []);
            }
        };
        homePageDetails();
    }, [channelId]);

    const scroll = (playlistId, direction) => {
        const ref = playlistRefs.current[playlistId];
        if (ref) {
            ref.scrollBy({ left: direction === 'left' ? -400 : 400, behavior: 'smooth' });
        }
    };

    return (
        <div className="channel-home">
            {/* Featured Video */}
            {featuredVideo && (
                <div className="featured-video-container">
                    <div
                        className="video-wrapper"
                        onClick={() => navigate(`/watch/${featuredVideo.url}`)}
                        style={{ cursor: 'pointer' }}
                    >
                        <img
                            src={`${API}${featuredVideo.thumbnail}`}
                            alt={featuredVideo.title}
                            className="featured-video-thumbnail"
                        />
                        <span className="video-title-text">{featuredVideo.title}</span>
                    </div>
                    <div className="featured-video-info-container">
                        <div className="info-wrapper">
                            <span className="featured-video-title">{featuredVideo.title}</span>
                            <span className="featured-video-meta">
                                {formatViews(featuredVideo.views)} views • {timeAgo(featuredVideo.createdAt || featuredVideo.created_at)}
                            </span>
                        </div>
                        {featuredVideo.description && (
                            <div className="featured-video-description-wrapper">
                                <span className={`featured-video-description ${showFullDescription ? 'expanded' : 'collapsed'}`}>
                                    {featuredVideo.description}
                                </span>
                                <span
                                    className="description-more-button"
                                    onClick={() => setShowFullDescription(!showFullDescription)}
                                >
                                    {showFullDescription ? 'Show less' : 'READ MORE'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Playlists */}
            {playlists.map(playlist => (
                <div className="playlist-section" key={playlist.id}>
                    <div className="playlist-header">
                        <div className="playlist-title-wrapper">
                            <h2 className="playlist-section-title">{playlist.name}</h2>
                            <button
                                className="play-all-btn"
                                onClick={() => playlist.videos[0] && navigate(`/watch/${playlist.videos[0].url}`)}
                            >
                                <span className="play-icon">▶</span> Play all
                            </button>
                        </div>
                        {playlist.description && (
                            <p className="playlist-description">{playlist.description}</p>
                        )}
                        <div className="scroll-buttons">
                            <button className="scroll-btn scroll-left" onClick={() => scroll(playlist.id, 'left')}>‹</button>
                            <button className="scroll-btn scroll-right" onClick={() => scroll(playlist.id, 'right')}>›</button>
                        </div>
                    </div>

                    <div
                        className="playlist-videos-container"
                        ref={el => playlistRefs.current[playlist.id] = el}
                    >
                        {playlist.videos.map((video, index) => (
                            <div
                                className="playlist-video-card"
                                key={video.id || index}
                                onClick={() => navigate(`/watch/${video.url}`)}
                            >
                                <div className="playlist-video-thumbnail-container">
                                    <img
                                        src={`${API}${video.thumbnail}`}
                                        alt={video.title}
                                        className="playlist-video-thumbnail"
                                    />
                                    <span className="playlist-video-duration">
                                        {formatDuration(video.duration)}
                                    </span>
                                </div>
                                <div className="playlist-video-info">
                                    <h3 className="playlist-video-title">{video.title}</h3>
                                    <div className="playlist-video-meta">
                                        <span className="playlist-video-stats">
                                            {formatViews(video.views)} views • {timeAgo(video.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* empty state */}
            {playlists.length === 0 && !featuredVideo && (
                <div className="channel-home-empty">
                    <p>No content yet.</p>
                </div>
            )}
        </div>
    );
}