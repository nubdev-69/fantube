import { useNavigate, useParams } from 'react-router-dom';
import './ChannelCustomize.css';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import ErrorPage from '../error/ErrorPage';

const API = 'http://localhost:5001';

export default function ChannelCustomize() {
    useEffect(() => {
          document.title = "Channel Customisation - FanTube Studio";
      }, []);
      
    const navigate = useNavigate();
    const { user } = useAuth();
    const { channelId } = useParams();
    if (!user) navigate('/login');

    if (user.userId !== channelId) {
        return (<ErrorPage></ErrorPage>)
    }
    const [error, setError] = useState(null);
    const [channelInfo, setChannelInfo] = useState(null);
    const [bannerFile, setBannerFile] = useState(null);
    const [bannerRemoved, setBannerRemoved] = useState(false);
    const [bannerPreview, setBannerPreview] = useState(null);
    const bannerInputRef = useRef(null);
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState(
        {
            name: '',
            description: '',
            links: [],
            featuredVideoId: null,
        }
    )
    const [original, setOriginal] = useState(null);
    const hasChanges = JSON.stringify(form) !== JSON.stringify(original) || bannerFile || bannerRemoved;

    const parseLinks = (links) => {
        if (!links || !Array.isArray(links)) return [];
        return links.map(link => {
            if (typeof link === 'string') {
                try { return JSON.parse(link); }
                catch { return { title: '', url: link }; }
            }
            return link;
        });
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const getChannelInfo = async () => {
            try {
                const res = await fetch(`${API}/api/channels/my`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const data = await res.json();
                if (res.ok) {
                    setChannelInfo(data.channel);
                    console.log(data.channel);
                    const f = {
                        name: data.channel.name,
                        description: data.channel.description || null,
                        links: parseLinks(data.channel.links),
                        featuredVideoId: data.channel.featured_video || null
                    }
                    setForm(f);
                    setOriginal(f);
                    setBannerPreview(`${API}${data.channel.banner}`);
                }
            } catch (error) {
                setError(error);
            }
        }
        getChannelInfo();
    }, [channelId]);

    const [myVideos, setMyVideos] = useState([]);
    useEffect(() => {
        const fetchChannelVideos = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch(`${API}/api/channels/my/videos`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data) {
                setMyVideos(data.videos);
            }
        }
        fetchChannelVideos();
    }, [channelId]);

    const handleBannerChangeButton = () => {
        bannerInputRef.current.click();
    }
    const handleBannerChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setBannerFile(file);
            setBannerPreview(URL.createObjectURL(file));
        }
    };
    const handleBannerRemove = () => {
        setBannerFile(null);
        setBannerRemoved(true);
        setBannerPreview(`${API}/uploads/banners/default-banner.png`);
    }
    const handleCancel = () => {
        setForm(original);
        console.log(form);
        console.log(original);
    }
    const handleAddLink = () => {
        if (form.links.length >= 5) return;
        setForm(f => ({ ...f, links: [...f.links, { title: '', url: '' }] }));
    };

    const handleLinkChange = (index, field, value) => {
        setForm(f => ({
            ...f,
            links: f.links.map((link, i) => i === index ? { ...link, [field]: value } : link)
        }));
    };

    const handleRemoveLink = (index) => {
        setForm(f => ({ ...f, links: f.links.filter((_, i) => i !== index) }));
    };

    const handleSave = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const formData = new FormData();
            formData.append('name', form.name);
            formData.append('description', form.description || '');
            formData.append('links', JSON.stringify(form.links || []));
            formData.append('featuredVideoId', form.featuredVideoId || '');
            if (bannerFile) formData.append('banner', bannerFile);
            else if (bannerRemoved) formData.append('removeBanner', true);
            const response = await fetch(`${API}/api/channels/${channelId}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });
            const res = await response.json();
            if (response.ok) {
                setSuccess("Channel updated successfully");
                setTimeout(() => setSuccess(''), 3000);
                const f = {
                    name: res.channel.name,
                    description: res.channel.description,
                    links: parseLinks(res.channel.links),
                    featuredVideoId:res.channel.featured_video
                }
                setForm(f);
                setOriginal(f);
                setChannelInfo(res.channel);
                setBannerPreview(`${API}${res.channel.banner}`)
                setBannerFile(null);
            } else {
                setError(res.error || 'Update failed');
            }
        } catch (error) {
            setError(error);
            setTimeout(() => setError(''), 3000);
        }
    }

    const visitChannel = () => {
        navigate(`/channel/${channelInfo.handle}`)
    }

    return channelInfo && (
        <div className="cc-page">
            {/* Headers */}
            <div className="cc-header">
                <h1 className="cc-title">Customization</h1>
                <div className="cc-header-actions">
                    <div className="cc-header-action-msg">
                        {success && (
                            <span className='cc-saved-badge'>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                                {success}
                            </span>
                        )}
                        {error && <div className="cc-error">{error.toString?.() || error}</div>}
                    </div>
                    <div className="cc-header-btns">
                        <button className="cc-btn-view-channel cc-action-btns" onClick={visitChannel}>View Channel</button>
                        <button className="cc-btn-undo cc-action-btns" onClick={handleCancel} disabled={!hasChanges}>cancel</button>
                        <button className="cc-btn-save cc-action-btns" disabled={!hasChanges} onClick={handleSave}>publish
                        </button>
                    </div>
                </div>
            </div>


            <div className="cc-body">
                {/* Banner */}
                <div className="cc-body-main">
                    <div className="cc-banner-card">
                        <div className="cc-banner-info">
                            <span className="cc-banner-label">Banner image</span>
                            <span className="cc-banner-sublabel">This image will appear across the top of your channel.
                            </span>
                        </div>
                        <div className="cc-banner-body">
                            <div className="cc-banner-container">
                                <img src={`${bannerPreview}`} alt="" className='cc-banner-img' />
                            </div>
                            <div className="banner-instruction">
                                <div className="banner-guide">
                                    <span>
                                        For the best results on all devices, use an image that's at least 2048 x 1152 pixels and 6 MB or less.
                                    </span>
                                </div>
                                <div className="cc-banner-btns">
                                    <input ref={bannerInputRef} id="banner-input" type="file" accept="image/*" onChange={handleBannerChange} style={{ display: 'none' }} />
                                    <button className="banner-change" onClick={handleBannerChangeButton}>
                                        Change</button>
                                    <button className="banner-remove" onClick={handleBannerRemove}>Remove</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="cc-name-card">
                        <div className="cc-name-header cc-card-header">
                            <span className="cc-name cc-card-label" >Name</span>
                            <span className="cc-name-sublabel cc-card-sublabel">
                                Choose a channel name that represents you and your content. Changes made to your name and picture are only visible on YouTube and not on other services.
                            </span>
                        </div>
                        <div className="cc-name-input cc-card-input">
                            <input type="text" className="cc-name cc-card-input" value={form.name} onChange={e => setForm(f => ({
                                ...f, name: e.target.value
                            }))} maxLength={20} placeholder='Enter a Channel Name' />
                        </div>
                    </div>
                    <div className="cc-handle-card">
                        <div className="cc-handle-header cc-card-header">
                            <span className="cc-handle-label cc-card-label">Handle</span>
                            <span className="cc-handle-sublabel cc-card-sublabel">
                                Handles are unique and can be used to identify you accross the services.
                            </span>
                        </div>
                        <div className="cc-handle-input cc-card-input">
                            <input type="text" className="cc-handle cc-card-input" value={channelInfo.handle} maxLength="20" placeholder='Your handle' readOnly />
                        </div>
                    </div>
                    <div className="cc-description-card">
                        <div className="cc-description-header cc-card-header">
                            <span className="cc-description-label cc-card-label">Handle</span>
                            <span className="cc-description-sublabel cc-card-sublabel">
                                Handles are unique and can be used to identify you accross the services.
                            </span>
                        </div>
                        <div className="cc-description-input cc-card-input">
                            <textarea rows={7} type="text" className="cc-description cc-card-input" value={form.description} maxLength="500" placeholder='Channel Description' onChange={e => setForm(f => ({
                                ...f, description: e.target.value
                            }))} />
                        </div>
                    </div>
                    <div className="cc-link-card">
                        <div className="cc-card-header">
                            <span className="cc-card-label">Links</span>
                            <span className="cc-card-sublabel">
                                Add links to your website or social media. Maximum 5 links.
                            </span>
                        </div>
                        <div className="cc-link-list">
                            {
                                form.links && (form.links||[]).map((link, index) => (
                                    <div key={index} className="cc-link-item">
                                        <div className="cc-link-fields">
                                            <input
                                                type="text"
                                                className="cc-card-input cc-link-title"
                                                placeholder="Link title (e.g. Twitter)"
                                                value={link.title || ''}
                                                maxLength={30}
                                                onChange={e => handleLinkChange(index, 'title', e.target.value)}
                                            />
                                            <input
                                                type="url"
                                                className="cc-card-input cc-link-url"
                                                placeholder="URL (e.g. https://twitter.com/...)"
                                                value={link.url || ''}
                                                onChange={e => handleLinkChange(index, 'url', e.target.value)}
                                            />
                                        </div>
                                        <button
                                            className="cc-link-remove"
                                            onClick={() => handleRemoveLink(index)}
                                            title="Remove link"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))
                            }
                        </div>
                        {(form.links || []).length < 5 ? (
                            <button className="cc-link-add" onClick={handleAddLink}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                                Add link ({form.links.length}/5)
                            </button>
                        ) : (
                            <p className="cc-links-max">Maximum 5 links reached</p>
                        )}
                    </div>
                </div>
                <div className="cc-info">
                    <div className="cc-pfp-container" onClick={visitChannel} data-tooltip="View channel">
                        <img src={`${API}${channelInfo.pfp}`} className='cc-info-pfp' alt={channelInfo.name} />
                    </div>
                    <div className="cc-info-name-wrapper">
                        <span className="cc-info-name">
                            {channelInfo.name}
                        </span>
                    </div>
                    <div className="cc-featured-wrapper">
                        <label className="cc-card-label">Featured video</label>
                        <p className="cc-card-sublabel">Shown on your channel homepage.</p>
                        <select
                            className="cc-featured-select"
                            value={form.featuredVideoId || ''}
                            onChange={e => setForm(f => ({
                                ...f,
                                featuredVideoId: Number(e.target.value) || null
                            }))}
                        >
                            <option value="">— None —</option>
                            {(myVideos || []).map(video => (
                                <option key={video.id} value={video.id}>
                                    {video.title}
                                </option>
                            ))}
                        </select>

                        {/* show selected video thumbnail */}
                        {form.featuredVideoId && myVideos && (
                            () => {
                                const selected = myVideos.find(v => v.id === form.featuredVideoId);
                                return selected ? (
                                    <div className="cc-featured-preview">
                                        <img
                                            src={selected.thumbnail ? `${API}${selected.thumbnail}` : '/default-thumb.png'}
                                            alt={selected.title}
                                            className="cc-featured-preview-thumb"
                                        />
                                        <p className="cc-featured-preview-title">{selected.title}</p>
                                    </div>
                                ) : null;
                            }
                        )()}
                    </div>
                </div>
            </div>
        </div>
    )
}