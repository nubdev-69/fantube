import { useState, useEffect } from "react";
import './videos.css'
import more from '../video/assets/more.png'
import { formatDuration, formatViews, timeAgo } from "../../assets/utils/format";
import { useParams } from "react-router-dom";

const API = 'http://localhost:5001';

export default function Videos() {
    const [videos, setVideos] = useState(null);
    const { channelId } = useParams();

    useEffect(() => {
        const getChannelVideos = async () => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/channels/${channelId}/videos`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            const data = await res.json();
            setVideos(data.videos);
        }
        getChannelVideos();
    }, [channelId]);

    return (videos && <div className="channel-videos">
        {
            videos.map(
                video => (
                    <div key={video.id} className="video-container">
                        <div className="video-thumbnail-container">
                            <img src={`${API}${video.thumbnail}`} alt={video.channel.name} className="video-thumbnail" />
                            <span className="video-duration">{formatDuration(video.duration)}</span>
                        </div>
                        <div className="video-info-container">
                            <div className="video-info">
                                <span className="channel-video-title">
                                    {video.title}
                                </span>
                                <span className="video-meta-info">{formatViews(video.views)} views • {video.publishedAt ? timeAgo(video.publishedAt) : 'N/A'}</span>
                            </div>
                            <div className="more-img-container">
                                <img src={more} alt="" className="more-button" />
                            </div>
                        </div>
                    </div>
        
                )
                )
        }

    </div>);
}