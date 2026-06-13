import { useState, useEffect, useRef, useCallback } from "react";
import VideoCard from "./VideoCard";
import './VideoMenu.css';
import ErrorPage from "../pages/error/ErrorPage";

export default function VideoMenu() {
    useEffect(() => {
        document.title = "FanTube";
    }, []);

    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const observer = useRef();

    // Intersection Observer for last video element
    const lastVideoRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => prev + 1);
            }
        });

        if (node) observer.current.observe(node);
    }, [loading, hasMore]);


    useEffect(() => {
        const fetchVideos = async () => {
            if (loading) return;
            setLoading(true);

            const token = localStorage.getItem('token');
            try {
                const res = await fetch(
                    `http://localhost:5001/api/videos?page=${page}&limit=15`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );
                const data = await res.json();

                if (data.videos && data.videos.length > 0) {
                    setVideos(prev => {
                        // Deduplicate by videoId
                        const existing = new Set(prev.map(v => v.videoId));
                        const newVideos = data.videos.filter(v => !existing.has(v.videoId));
                        return [...prev, ...newVideos];
                    });

                    // If less than limit, no more videos available
                    if (data.videos.length < 15) {
                        setHasMore(false);
                    }
                } else {
                    setHasMore(false);
                }
            } catch (err) {
                console.error("Failed to fetch videos", err);
                setHasMore(false);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, [page]);

    if (!videos.length && !loading) {
        return (
            <ErrorPage />
        );
    }

    return (
        <div className='vid-menu'>
            {videos.map((video, index) => {
                // Attach observer to last video
                if (videos.length === index + 1) {
                    return (
                        <div ref={lastVideoRef} key={video.videoId}>
                            <VideoCard video={video} />
                        </div>
                    );
                } else {
                    return <VideoCard key={video.videoId} video={video} />;
                }
            })}

            {loading && (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading more videos...</p>
                </div>
            )}

            {!hasMore && videos.length > 0 && (
                <div className="end-message">
                    <p>No more videos to load</p>
                </div>
            )}
        </div>
    );
}