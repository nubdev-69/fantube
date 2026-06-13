import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Subscription.css';
import { formatViews, timeAgo, formatDuration } from '../../../assets/utils/format';

const API = 'http://localhost:5001';

export default function Subscription() {
    useEffect(() => {
          document.title = "Subscriptions - FanTube";
      }, []);
    const navigate = useNavigate();
    const [subscriptions, setSubscriptions] = useState([]);
    const [feed, setFeed] = useState([]);
    const [activeTab, setActiveTab] = useState('feed');
    const [loading, setLoading] = useState(true);
    const [selectedChannel, setSelectedChannel] = useState(null); // null = show all

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        const fetchAll = async () => {
            setLoading(true);
            try {
                const [subRes, feedRes] = await Promise.all([
                    fetch(`${API}/api/user/subscriptions`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    fetch(`${API}/api/user/subscriptions/feed`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);

                const subData  = await subRes.json();
                const feedData = await feedRes.json();

                if (subRes.ok)  setSubscriptions(subData.subscriptions  || []);
                if (feedRes.ok) setFeed(feedData.videos || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, []);

    // Toggle: clicking the same channel again clears the filter
    const handleChannelClick = (channelHandle) => {
        setSelectedChannel(prev => prev === channelHandle ? null : channelHandle);
    };

    // Filter feed by selected channel, or show all
    const filteredFeed = selectedChannel
        ? feed.filter(v => v.handle === selectedChannel)
        : feed;

    return (
        <div className="sub-page">
            <h1 className="sub-title">Subscriptions</h1>

            {subscriptions.length > 0 && (
                <div className="sub-channels-row">
                    {subscriptions.map(ch => (
                        <div
                            key={ch.id}
                            className={`sub-channel-avatar-wrap ${selectedChannel === ch.handle ? 'active' : ''}`}
                            onClick={() => handleChannelClick(ch.handle)}
                        >
                            <div className="sub-avatar-ring">
                                <img
                                    src={ch.pfp ? `${API}${ch.pfp}` : '/default-avatar.png'}
                                    alt={ch.name}
                                />
                            </div>
                            <span className={`sub-avatar-name ${selectedChannel === ch.handle ? 'active' : ''}`}>
                                {ch.name}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Active filter indicator */}
            {selectedChannel && (
                <div className="sub-filter-bar">
                    <span>
                        Filtered by: <strong>
                            {subscriptions.find(c => c.handle === selectedChannel)?.name}
                        </strong>
                    </span>
                    <button
                        className="sub-filter-clear"
                        onClick={() => setSelectedChannel(null)}
                    >
                        Clear filter ×
                    </button>
                </div>
            )}

            <div className="sub-tabs">
                <button
                    className={`sub-tab ${activeTab === 'feed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('feed')}
                >
                    Latest
                </button>
                <button
                    className={`sub-tab ${activeTab === 'channels' ? 'active' : ''}`}
                    onClick={() => setActiveTab('channels')}
                >
                    Channels
                </button>
            </div>

            {loading ? (
                <div className="sub-loading">Loading...</div>
            ) : activeTab === 'feed' ? (
                <FeedTab feed={filteredFeed} navigate={navigate} />
            ) : (
                <ChannelsTab subscriptions={subscriptions} navigate={navigate} />
            )}
        </div>
    );
}

function FeedTab({ feed, navigate }) {
    if (feed.length === 0) return (
        <div className="sub-empty">
            <p>No videos from your subscriptions yet.</p>
        </div>
    );

    return (
        <div className="sub-feed-grid">
            {feed.map(video => (
                <div
                    key={video.videoId}
                    className="sub-video-card"
                    onClick={() => navigate(`/watch/${video.videoId}`)}
                >
                    <div className="sub-video-thumb">
                        <img
                            src={video.thumbnail ? `${API}${video.thumbnail}` : '/default-thumb.png'}
                            alt={video.title}
                        />
                        <span className="sub-video-duration">{formatDuration(video.duration)}</span>
                    </div>
                    <div className="sub-video-info">
                        <img
                            src={video.pfp ? `${API}${video.pfp}` : '/default-avatar.png'}
                            alt={video.channel}
                            className="sub-video-pfp"
                            onClick={e => { e.stopPropagation(); navigate(`/channel/${video.handle}`); }}
                        />
                        <div className="sub-video-text">
                            <p className="sub-video-title">{video.title}</p>
                            <p className="sub-video-channel">{video.channel}</p>
                            <p className="sub-video-meta">
                                {formatViews(video.views)} views • {timeAgo(video.publishedAt)}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function ChannelsTab({ subscriptions, navigate }) {
    if (subscriptions.length === 0) return (
        <div className="sub-empty">
            <p>You haven't subscribed to any channels yet.</p>
        </div>
    );

    return (
        <div className="sub-channels-grid">
            {subscriptions.map(ch => (
                <div
                    key={ch.id}
                    className="sub-channel-card"
                    onClick={() => navigate(`/channel/${ch.handle}`)}
                >
                    <img
                        src={ch.pfp ? `${API}${ch.pfp}` : '/default-avatar.png'}
                        alt={ch.name}
                        className="sub-channel-pfp"
                    />
                    <div className="sub-channel-info">
                        <p className="sub-channel-name">{ch.name}</p>
                        <p className="sub-channel-handle">@{ch.handle}</p>
                        <p className="sub-channel-stats">
                            {formatViews(ch.subsCount)} subscribers • {ch.videoCount} videos
                        </p>
                    </div>
                    {ch.latestVideo && (
                        <div className="sub-channel-latest">
                            <img
                                src={`${API}${ch.latestVideo.thumbnail}`}
                                alt={ch.latestVideo.title}
                                className="sub-channel-latest-thumb"
                                onClick={e => { e.stopPropagation(); navigate(`/watch/${ch.latestVideo.videoId}`); }}
                            />
                            <p className="sub-channel-latest-title">{ch.latestVideo.title}</p>
                            <p className="sub-channel-latest-date">{timeAgo(ch.latestVideo.publishedAt)}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}