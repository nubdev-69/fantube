import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import './StudioPage.css';
import { formatViews, timeAgo, formatDuration } from '../../../assets/utils/format';

const API = 'http://localhost:5001';
export default function StudioPage() {

    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [stats, setStats] = useState(null);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('home');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        const fetchStudio = async () => {
            setLoading(true);
            try {
                const [statsRes, videosRes] = await Promise.all([
                    fetch(`${API}/api/channels/studio/stats`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    fetch(`${API}/api/channels/my/videos`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);

                const [statsData, videosData] = await Promise.all([
                    statsRes.json(), videosRes.json()
                ]);

                if (statsRes.ok) setStats(statsData.stats);
                if (videosRes.ok) setVideos(videosData.videos || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchStudio();
    }, []);

    const tabs = [
        { id: 'home', label: 'Home' },
        { id: 'content', label: 'Content' },
    ];

    const handleVideoDelete = (deletedId) => {
        setVideos(prev => prev.filter(v => v.id !== deletedId));
    };

    return (
        <div className="studio-page">
            {/* Top Header */}
            <div className="studio-header">
                <div className="studio-header-left">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" />
                    </svg>
                    <span className="studio-brand">Studio</span>
                </div>

                {stats && (
                    <div
                        className="studio-header-profile"
                        onClick={() => navigate(`/channel/${stats.handle}`)}
                        
                    >
                        <img
                            src={stats.pfp ? `${API}${stats.pfp}` : '/default-avatar.png'}
                            alt={stats.name}
                            className="studio-header-pfp"
                        />
                        <div>
                            <p className="studio-header-name">{stats.name}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Tab Bar */}
            <div className="studio-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`studio-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.id === 'home' && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                        )}
                        {tab.id === 'content' && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="3" width="20" height="14" rx="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                        )}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="studio-main">
                {loading ? (
                    <div className="studio-loading">Loading...</div>
                ) : activeTab === 'home' ? (
                    <HomeTab stats={stats} videos={videos} navigate={navigate} user={user} setActiveTab={setActiveTab}/>
                ) : (
                    <ContentTab videos={videos} navigate={navigate} onDelete={handleVideoDelete}/>
                )}
            </div>
        </div>
    );
}

// ── HOME TAB ──
function HomeTab({ stats, videos, navigate,setActiveTab }) {
    useEffect(() => {
          document.title = "Channel Dashboard - FanTube Studio";
      }, []);

    return (
        <div className="studio-home">
            <h1 className="studio-page-title">Channel dashboard</h1>

            {/* Stats */}
            {stats && (
                <div className="studio-stats-grid">
                    <div className="studio-stat-card">
                        <p className="studio-stat-label">Total views</p>
                        <p className="studio-stat-value">{formatViews(stats.totalViews)}</p>
                    </div>
                    <div className="studio-stat-card">
                        <p className="studio-stat-label">Subscribers</p>
                        <p className="studio-stat-value">{formatViews(stats.subsCount)}</p>
                    </div>
                    <div className="studio-stat-card" onClick={() => {setActiveTab('content')}}>
                        <p className="studio-stat-label">Videos</p>
                        <p className="studio-stat-value">{stats.videoCount}</p>
                    </div>
                </div>
            )}

            <div className="studio-home-grid">
                {/* Latest videos */}
                <div className="studio-home-card">
                    <div className="studio-home-card-header">
                        <h2>Latest videos</h2>
                        <button
                            className="studio-text-btn"
                            onClick={() => {setActiveTab('content')}}
                        >
                            Go to content →
                        </button>
                    </div>
                    {videos.length === 0 ? (
                        <p className="studio-empty-text">No videos yet.</p>
                    ) : (
                        <div className="studio-latest-list">
                            {videos.slice(0, 4).map(video => (
                                <div key={video.id} className="studio-latest-item">
                                    <img
                                        src={video.thumbnail ? `${API}${video.thumbnail}` : '/default-thumb.png'}
                                        alt={video.title}
                                        className="studio-latest-thumb"
                                        onClick={() => navigate(`/watch/${video.video_id}`)}
                                    />
                                    <div className="studio-latest-info">
                                        <p className="studio-latest-title">{video.title}</p>
                                        <p className="studio-latest-meta">
                                            {formatViews(video.views)} views • {timeAgo(video.created_at)}
                                        </p>
                                    </div>
                                    <button
                                        className="studio-edit-btn-sm"
                                        onClick={() => navigate(`/video/${video.video_id}/edit`)}
                                    >
                                        Edit
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Customization */}
                <div className="studio-home-card">
                    <div className="studio-home-card-header">
                        <h2>Customization</h2>
                    </div>
                    <p className="studio-card-sublabel">
                        Personalise your channel with a unique look. Update your banner, description and links.
                    </p>
                    <button
                        className="studio-customize-btn"
                        onClick={() => navigate(`/channel/${stats?.handle}/customize`)}
                    >
                        Customize channel
                    </button>

                    <div className="studio-home-card-header" style={{ marginTop: 20 }}>
                        <h2>Your channel</h2>
                    </div>
                    <p className="studio-card-sublabel">
                        See how your channel looks to viewers.
                    </p>
                    <button
                        className="studio-view-btn"
                        onClick={() => navigate(`/channel/${stats?.handle}`)}
                    >
                        View channel
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── CONTENT TAB ──
// function ContentTab({ videos, navigate }) {
//     const [search, setSearch] = useState('');
//     const [showModel,setShowModel]=useState(false); //to ask confirmation of user;



//     const filtered = videos.filter(v =>
//         v.title?.toLowerCase().includes(search.toLowerCase())
//     );

//     const deleteVideo=async(id)=>{

//     }
    
//     const handleDelete = (id)=>{
//         console.log(id);
//         setShowModel(true);
//     }

//     return (
//         <div className="studio-content">
//             <div className="studio-content-header">
//                 <h1 className="studio-page-title">Channel content</h1>
//                 <input
//                     className="studio-search"
//                     placeholder="Search videos..."
//                     value={search}
//                     onChange={e => setSearch(e.target.value)}
//                 />
//             </div>

//             {filtered.length === 0 ? (
//                 <div className="studio-empty">
//                     <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
//                         <rect x="2" y="3" width="20" height="14" rx="2" />
//                         <line x1="8" y1="21" x2="16" y2="21" />
//                         <line x1="12" y1="17" x2="12" y2="21" />
//                     </svg>
//                     <p>No videos found.</p>
//                 </div>
//             ) : (
//                 <div className="studio-table">
//                     <div className="studio-table-header">
//                         <span>Video</span>
//                         <span>Visibility</span>
//                         <span>Views</span>
//                         <span>Duration</span>
//                         <span>Date</span>
//                         <span>Actions</span>
//                     </div>

//                     {filtered.map(video => (
//                         <div key={video.id} className="studio-table-row">
//                             <div
//                                 className="studio-table-video"
//                                 onClick={() => navigate(`/watch/${video.video_id}`)}
//                             >
//                                 <div className="studio-table-thumb">
//                                     <img
//                                         src={video.thumbnail ? `${API}${video.thumbnail}` : '/default-thumb.png'}
//                                         alt={video.title}
//                                     />
//                                     <span className="studio-table-duration">
//                                         {formatDuration(video.duration)}
//                                     </span>
//                                 </div>
//                                 <p className="studio-table-title">{video.title}</p>
//                             </div>

//                             <span className={`studio-visibility-badge ${video.visibility}`}>
//                                 {video.visibility === 'public' && 
//                                 '🌐 '}
//                                 {video.visibility === 'private' && '🔒 '}
//                                 {video.visibility === 'unlisted' && '🔗 '}
//                                 {video.visibility}
//                             </span>

//                             <span className="studio-table-cell">{formatViews(video.views)}</span>
//                             <span className="studio-table-cell">{formatDuration(video.duration)}</span>
//                             <span className="studio-table-cell">{timeAgo(video.createdAt)}</span>

//                             <div className="studio-table-actions">
//                                 <button
//                                     className="studio-action-edit"
//                                     onClick={() => navigate(`/video/${video.video_id}/edit`)}
//                                     title="Edit video"
//                                 >
//                                     Edit
//                                 </button>
//                                 <button
//                                     className="studio-action-watch"
//                                     onClick={() => navigate(`/watch/${video.video_id}`)}
//                                     title="Watch video"
//                                 >
//                                     Play
//                                 </button>
//                                 <button
//                                     className="studio-action-del"
//                                     onClick={() => handleDelete(video.id)}
//                                     title="Delete video"
//                                 >
//                                     <img src="/utlis/delete.png" alt="Delete" height="20px" className="studio-action-del-btn" />
//                                 </button>
//                             </div>
//                         </div>
//                     ))}
//                 </div>
//             )}
//         </div>
//     );
// }

function ContentTab({ videos, navigate, onDelete }) {
    useEffect(() => {
          document.title = "Channel Content - FanTube Studio";
      }, []);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const filtered = videos.filter(v =>
        v.title?.toLowerCase().includes(search.toLowerCase())
    );

    const handleDeleteClick = (video) => {
        setSelectedVideo(video);
        setShowModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedVideo) return;
        setDeleting(true);

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API}/api/videos/${selectedVideo.video_id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                onDelete(selectedVideo.id); // ✅ remove from list
                setShowModal(false);
                setSelectedVideo(null);
            } else {
                const data = await res.json();
                alert(data.error || 'Delete failed');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="studio-content">
            <div className="studio-content-header">
                <h1 className="studio-page-title">Channel content</h1>
                <input
                    className="studio-search"
                    placeholder="Search videos..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {filtered.length === 0 ? (
                <div className="studio-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                        <rect x="2" y="3" width="20" height="14" rx="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                    <p>No videos found.</p>
                </div>
            ) : (
                <div className="studio-table">
                    <div className="studio-table-header">
                        <span>Video</span>
                        <span>Visibility</span>
                        <span>Views</span>
                        <span>Duration</span>
                        <span>Date</span>
                        <span>Actions</span>
                    </div>

                    {filtered.map(video => (
                        <div key={video.id} className="studio-table-row">
                            <div className="studio-table-video" onClick={() => navigate(`/watch/${video.video_id}`)}>
                                <div className="studio-table-thumb">
                                    <img src={video.thumbnail ? `${API}${video.thumbnail}` : '/default-thumb.png'} alt={video.title}/>
                                    <span className="studio-table-duration">{formatDuration(video.duration)}</span>
                                </div>
                                <p className="studio-table-title">{video.title}</p>
                            </div>

                            <span className={`studio-visibility-badge ${video.visibility}`}>
                                {video.visibility === 'public'   && '🌐 '}
                                {video.visibility === 'private'  && '🔒 '}
                                {video.visibility === 'unlisted' && '🔗 '}
                                {video.visibility}
                            </span>

                            <span className="studio-table-cell">{formatViews(video.views)}</span>
                            <span className="studio-table-cell">{formatDuration(video.duration)}</span>
                            <span className="studio-table-cell">{timeAgo(video.created_at)}</span>

                            <div className="studio-table-actions">
                                <button className="studio-action-edit" onClick={() => navigate(`/video/${video.video_id}/edit`)}>Edit</button>
                                <button className="studio-action-watch" onClick={() => navigate(`/watch/${video.video_id}`)}>Play</button>
                                <button
                                    className="studio-action-del"
                                    onClick={() => handleDeleteClick(video)}
                                    title="Delete video"
                                >
                                    <img src="utlis/delete.png" alt="Delete" height="20px" className="studio-action-del-img" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ✅ Confirmation Modal */}
            {showModal && selectedVideo && (
                <>
                    <div className="studio-modal-backdrop" onClick={() => !deleting && setShowModal(false)} />
                    <div className="studio-modal">
                        <div className="studio-modal-header">
                            <h3>Delete video?</h3>
                        </div>
                        <div className="studio-modal-body">
                            <div className="studio-modal-preview">
                                <img
                                    src={selectedVideo.thumbnail ? `${API}${selectedVideo.thumbnail}` : '/default-thumb.png'}
                                    alt={selectedVideo.title}
                                    className="studio-modal-thumb"
                                />
                                <div>
                                    <p className="studio-modal-title">{selectedVideo.title}</p>
                                    <p className="studio-modal-meta">
                                        {formatViews(selectedVideo.views)} views • {timeAgo(selectedVideo.createdAt)}
                                    </p>
                                </div>
                            </div>
                            <p className="studio-modal-warning">
                                This action is <strong>permanent</strong>. The video, its comments, likes, and watch history will all be deleted and cannot be recovered.
                            </p>
                        </div>
                        <div className="studio-modal-actions">
                            <button
                                className="studio-modal-cancel"
                                onClick={() => setShowModal(false)}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                className="studio-modal-confirm"
                                onClick={handleDeleteConfirm}
                                disabled={deleting}
                            >
                                {deleting ? 'Deleting...' : 'Delete permanently'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}