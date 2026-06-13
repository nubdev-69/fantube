import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { formatDuration, formatViews, timeAgo } from '../../assets/utils/format';
import more from './assets/more.png';

const API = 'http://localhost:5001';

export default function SuggestedVideoCard() {
    const navigate = useNavigate();
    const { videoId } = useParams();  // ✅ get current videoId from URL
    const [suggestedVideos, setSuggestedVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSuggested = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API}/api/videos/${videoId}/suggested`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                const data = await res.json();
                if (res.ok) setSuggestedVideos(data.videos || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (videoId) fetchSuggested();
    }, [videoId]);  // ✅ refetch when video changes

    if (loading) return <div className="suggested-loading">Loading...</div>;
    if (!suggestedVideos.length) return null;

    return (
        <>
            {suggestedVideos.map(video => (
                <div
                    key={video.videoId}
                    className="suggested-video-card"
                    onClick={() => navigate(`/watch/${video.videoId}`)}
                >
                    <div className="vid-thumbnail">
                        <img
                            src={video.thumbnail ? `${API}${video.thumbnail}` : '/default-thumb.png'}
                            alt={video.title}
                            className="suggested-video-poster"
                        />
                        <p className="suggested-video-duration">{formatDuration(video.duration)}</p>
                    </div>
                    <div className="suggested-vid-info-container">
                        <div className="suggested-video-info">
                            <p className="suggested-vid-title">{video.title}</p>
                            <img src={more} alt="" className="suggested-more-img" />
                        </div>
                        <div className="suggested-video-chnl-info">
                            <p
                                className="suggested-video-chnl-name"
                                onClick={e => { e.stopPropagation(); navigate(`/channel/${video.handle}`); }}
                            >
                                {video.channel}
                            </p>
                            <p className="suggested-video-meta">
                                {formatViews(video.views)} • {timeAgo(video.publishedAt)}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}