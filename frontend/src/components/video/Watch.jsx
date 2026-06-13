import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import like from "./assets/like.png"
import share from "./assets/share.png"
import dislike from "./assets/dislike.png"
import seperate from "./assets/seperate.png"
import download from "./assets/downloads.png"
import more from "./assets/more.png"
import sort from './assets/sort.png'
import "./Watch.css"
import { formatViews, timeAgo } from "../../assets/utils/format";
import SuggestedVideoCard from "./SuggestedVideoCard.jsx"
import ErrorPage from "../pages/error/ErrorPage.jsx";
import Comment from "./Comment.jsx";
import { useAuth } from '../../context/AuthContext';

export default function Watch() {
    const navigate = useNavigate();
    const { videoId } = useParams();
    const [vid, setVid] = useState(null);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [subs, setSubs] = useState(false);
    const [error, setError] = useState('');  // ✅ was missing
    const { user } = useAuth();

    // loading video-data from backend
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [videoId]);

    useEffect(() => {
        document.title = vid?vid.title:"FanTube";
    }, [vid]);

    useEffect(() => {
        const fetchVideo = async () => {
            const token = localStorage.getItem('token')
            try {
                const res = await fetch(`http://localhost:5001/api/videos/${videoId}`, {
                    headers: {
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    }
                });
                const data = await res.json();
                setVid(data.video || null);
            } catch (err) {
                console.error('Failed to fetch video:', err);
            }
        };

        if (videoId) fetchVideo();
    }, [videoId]);

    const videoRef = useRef(null);
    const viewIdRef = useRef(null);
    const currentTimeRef = useRef(null);
    const durationRef = useRef(0);
    const [skipIndicator, setSkipIndicator] = useState(null);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        const handleKeyDown = (e) => {
            // Don't hijack shortcuts when user is typing in a field
            const tag = document.activeElement.tagName.toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;

            switch (e.key) {
                case ' ':
                case 'k':
                    e.preventDefault(); // stop page scroll
                    if (videoEl.paused) {
                        videoEl.play();
                    } else {
                        videoEl.pause();
                    }
                    break;

                case 'ArrowRight':
                case 'l':
                    e.preventDefault();
                    videoEl.currentTime = Math.min(videoEl.currentTime + 5, videoEl.duration);
                    setSkipIndicator('forward');
                    setTimeout(() => setSkipIndicator(null), 600);
                    break;

                case 'ArrowLeft':
                case 'j':
                    e.preventDefault();
                    videoEl.currentTime = Math.max(videoEl.currentTime - 5, 0);
                    setSkipIndicator('backward');
                    setTimeout(() => setSkipIndicator(null), 600);
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    videoEl.volume = Math.min(videoEl.volume + 0.1, 1);
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    videoEl.volume = Math.max(videoEl.volume - 0.1, 0);
                    break;

                case 'f':
                    e.preventDefault();
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else {
                        videoEl.requestFullscreen();
                    }
                    break;

                case 'm':
                    e.preventDefault();
                    videoEl.muted = !videoEl.muted;
                    break;

                default:
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [videoRef.current]);

    useEffect(() => {
        if (!vid) return;
        const recordWatch = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`http://localhost:5001/api/videos/${videoId}/watch`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    },
                    body: JSON.stringify({ watchDuration: 0, completed: false })
                });
                const data = await res.json();
                viewIdRef.current = data.id || null;
            } catch (err) {
                console.error(err);
            }
        };

        if (videoId) recordWatch();
    }, [vid]);
    useEffect(() => {
        return () => {
            if (!viewIdRef.current) {
                return;
            }

            const watchDuration = Math.floor(currentTimeRef.current);
            const completed = durationRef.current
                ? currentTimeRef.current / durationRef.current > 0.9
                : false;

            navigator.sendBeacon(
                `http://localhost:5001/api/videos/${videoId}/watch`,
                new Blob(
                    [JSON.stringify({
                        viewId: viewIdRef.current,
                        watchDuration,
                        completed
                    })],
                    { type: 'application/json' }
                )
            );

            // reset after sending
            viewIdRef.current = null;
            currentTimeRef.current = 0;
            durationRef.current = 0;
        };
    }, []);
    const handleTimeUpdate = () => {
        const videoEl = videoRef.current;
        if (!videoEl) return;
        currentTimeRef.current = videoEl.currentTime;
        durationRef.current = videoEl.duration;
    };

    //like dislike
    const [currentInteraction, setCurrentInteraction] = useState(null);
    const interactionIdRef = useRef(null);
    const [likes, setLikes] = useState(0);
    const [dislikes, setDislikes] = useState(0);

    useEffect(() => {
        if (vid) {
            setLikes(vid.likes || 0);
            setDislikes(vid.dislikes || 0);
        }
    }, [vid]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        const getInteraction = async () => {
            const res = await fetch(`http://localhost:5001/api/videos/${videoId}/interaction/status`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (res.ok) {
                setCurrentInteraction(data.interaction || null);
                interactionIdRef.current = data.id || null;
            }
        }
        getInteraction();
    }, [videoId])
    const handleInteraction = async (type) => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        const prev = currentInteraction;
        const newInteraction = prev === type ? null : type;
        setCurrentInteraction(newInteraction);
        if (prev === 'like') setLikes(l => l - 1);
        if (prev === 'dislike') setDislikes(d => d - 1);
        if (newInteraction === 'like') setLikes(l => l + 1);
        if (newInteraction === 'dislike') setDislikes(d => d + 1);

        try {
            const res = await fetch(`http://localhost:5001/api/videos/${videoId}/interaction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    id: interactionIdRef.current,
                    interaction: newInteraction
                })
            });
            const data = await res.json();
            if (res.ok) {
                interactionIdRef.current = data.id;
                setCurrentInteraction(data.interaction);
            } else {
                setCurrentInteraction(prev);
                if (prev === 'like') setLikes(l => l + 1);
                if (prev === 'dislike') setDislikes(d => d + 1);
                if (newInteraction === 'like') setLikes(l => l - 1);
                if (newInteraction === 'dislike') setDislikes(d => d - 1);
            }
        } catch (error) {
            console.error("interaction error", error);
        }
    }


    useEffect(() => {
        const checkSubscription = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            if (vid) {
                try {
                    const res = await fetch(`http://localhost:5001/api/channels/${vid.channel.handle}/subscribe/status`, {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    const data = await res.json();
                    if (res.ok) {
                        setSubs(data.subscribed);
                    }

                } catch (error) {
                    console.log(error);
                }
            }
        }
        checkSubscription();
    }, [videoId, vid])

    const handleChannelClick = (e) => {
        e.stopPropagation();
        if (vid?.channel) navigate(`/channel/${vid.channel.handle}`);
    };

    const handleSubs = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('You must be logged in to Subscribe');
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5001/api/channels/${vid.channel.handle}/subscribe`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (response.ok) {
                setSubs(data.subscribed);
            }
        } catch (err) {
            console.error('Subscribe error:', err);
        }
    };

    return (
        <div className="watch">
            <div className="main-video">
                {vid ? (
                    <>
                        <div className="video-wrapper">
                            <video
                                ref={videoRef}
                                src={`http://localhost:5001${vid.url}`}
                                width="100%"
                                controls
                                autoPlay
                                onTimeUpdate={handleTimeUpdate}
                                poster={`http://localhost:5001${vid.thumbnail?.url}`}
                                className="main-vid"
                            />
                            {skipIndicator === 'backward' && (
                                <div className="skip-indicator skip-backward">
                                    <span>⟪ 5s</span>
                                </div>
                            )}
                            {skipIndicator === 'forward' && (
                                <div className="skip-indicator skip-forward">
                                    <span>5s ⟫</span>
                                </div>
                            )}
                        </div>
                        <div className="vid-info">
                            <span className="video-title">{vid.title}</span>
                            <div className="watch-video-info">
                                <div className="chnl-info">
                                    <img
                                        onClick={handleChannelClick}
                                        src={`http://localhost:5001${vid.channel.avatar}`}
                                        alt={vid.channel.name}
                                        className="chnl-avatar"
                                    />
                                    <div className="chnl-name-container">
                                        <h4 onClick={handleChannelClick} className="chnl-name">
                                            {vid.channel.name}
                                        </h4>
                                        <p className="chnl-sub-count">
                                            {formatViews(vid.channel.subsCount)} subscribers
                                        </p>
                                    </div>
                                    {user?.userId === vid?.channel?.handle && (
                                        <div className="edit-video-btn" onClick={() => navigate(`/video/${videoId}/edit`)}>
                                            <p className="edit-video-text">Edit Video</p>
                                        </div>
                                    )}
                                    {user?.userId !== vid?.channel?.handle && (
                                        <div className="subs-btn">
                                            <p className="subs-text" onClick={handleSubs}>
                                                {subs ? 'Subscribed' : 'Subscribe'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="video-meta">
                                    <div className="like-data">
                                        <div
                                            className={`like ${currentInteraction === 'like' ? 'active' : ''}`}
                                            onClick={() => handleInteraction('like')}
                                        >
                                            <img src={like} alt="like" className="like-img" />
                                            <p className="like-count">{formatViews(likes)}</p>
                                        </div>

                                        <div className="seperate-container">
                                            <img src={seperate} alt="|" className="seperate-bar" />
                                        </div>

                                        <div
                                            className={`dislike-btn ${currentInteraction === 'dislike' ? 'active' : ''}`}
                                            onClick={() => handleInteraction('dislike')}
                                        >
                                            <img src={dislike} alt="Dislike" className="dislike-img" />
                                        </div>
                                    </div>
                                    <div className="share" >
                                        <img src={share} alt="Share" className="share-img" />
                                        <p className="share-text">Share</p>
                                    </div>
                                    <div className="download">
                                        <img src={download} alt="Download" className="download-img" />
                                        <p className="download-txt">Download</p>
                                    </div>
                                    <div className="more">
                                        <img src={more} alt="more" className="more-img" />
                                    </div>
                                </div>
                            </div>

                            <div className="description">
                                <div className="video-data">
                                    <p className="viewss-count">{formatViews(vid.views)} Views</p>
                                    <p className="time">{timeAgo(vid.publishedAt)}</p>
                                </div>
                                <div>
                                    <p className={`description-txt ${showFullDescription ? 'expanded' : ''}`}>
                                        {vid.description}
                                    </p>
                                    {vid.description?.length > 250 && (
                                        <button
                                            className="show-more-btn"
                                            onClick={() => setShowFullDescription(!showFullDescription)}
                                        >
                                            {showFullDescription ? 'Show less' : 'Show more'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {error && <p className="error-msg">{error}</p>}

                        <Comment />
                    </>
                )
                    :
                    <>
                        <ErrorPage />
                    </>}
            </div>

            {
                <div className="suggested-videos">
                    <SuggestedVideoCard />
                </div>
            }
        </div>
    );
}