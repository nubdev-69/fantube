// EditPage.jsx
import { useAuth } from '../../../context/AuthContext';
import './EditPage.css';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ErrorPage from '../error/ErrorPage';

const API = 'http://localhost:5001/api';

const CATEGORIES = [
    'Gaming', 'Education', 'Entertainment', 'Music', 'Sports', 'Technology', 'Vlogs'
];

const PublicIcon = () => (
    <svg width="18" height="18" viewBox="-1 0 19 19" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.417 9.57a7.917 7.917 0 1 1-8.144-7.908 1.758 1.758 0 0 1 .451 0 7.913 7.913 0 0 1 7.693 7.907zM5.85 15.838q.254.107.515.193a11.772 11.772 0 0 1-1.572-5.92h-3.08a6.816 6.816 0 0 0 4.137 5.727zM2.226 6.922a6.727 6.727 0 0 0-.511 2.082h3.078a11.83 11.83 0 0 1 1.55-5.89q-.249.083-.493.186a6.834 6.834 0 0 0-3.624 3.622zm8.87 2.082a14.405 14.405 0 0 0-.261-2.31 9.847 9.847 0 0 0-.713-2.26c-.447-.952-1.009-1.573-1.497-1.667a8.468 8.468 0 0 0-.253 0c-.488.094-1.05.715-1.497 1.668a9.847 9.847 0 0 0-.712 2.26 14.404 14.404 0 0 0-.261 2.309zm-.974 5.676a9.844 9.844 0 0 0 .713-2.26 14.413 14.413 0 0 0 .26-2.309H5.903a14.412 14.412 0 0 0 .261 2.31 9.844 9.844 0 0 0 .712 2.259c.487 1.036 1.109 1.68 1.624 1.68s1.137-.644 1.623-1.68zm4.652-2.462a6.737 6.737 0 0 0 .513-2.107h-3.082a11.77 11.77 0 0 1-1.572 5.922q.261-.086.517-.194a6.834 6.834 0 0 0 3.624-3.621zM11.15 3.3a6.82 6.82 0 0 0-.496-.187 11.828 11.828 0 0 1 1.55 5.89h3.081A6.815 6.815 0 0 0 11.15 3.3z" />
    </svg>
);

const PrivateIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 14.5V16.5M7 10.0288C7.47142 10 8.05259 10 8.8 10H15.2C15.9474 10 16.5286 10 17 10.0288M7 10.0288C6.41168 10.0647 5.99429 10.1455 5.63803 10.327C5.07354 10.6146 4.6146 11.0735 4.32698 11.638C4 12.2798 4 13.1198 4 14.8V16.2C4 17.8802 4 18.7202 4.32698 19.362C4.6146 19.9265 5.07354 20.3854 5.63803 20.673C6.27976 21 7.11984 21 8.8 21H15.2C16.8802 21 17.7202 21 18.362 20.673C18.9265 20.3854 19.3854 19.9265 19.673 19.362C20 18.7202 20 17.8802 20 16.2V14.8C20 13.1198 20 12.2798 19.673 11.638C19.3854 11.0735 18.9265 10.6146 18.362 10.327C18.0057 10.1455 17.5883 10.0647 17 10.0288M7 10.0288V8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8V10.0288" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const UnlistedIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.5442 10.4558C11.8385 8.75022 9.07316 8.75022 7.36753 10.4558L4.27922 13.5442C2.57359 15.2498 2.57359 18.0152 4.27922 19.7208C5.98485 21.4264 8.75021 21.4264 10.4558 19.7208L12 18.1766" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.4558 13.5442C12.1614 15.2498 14.9268 15.2498 16.6324 13.5442L19.7207 10.4558C21.4264 8.75021 21.4264 5.98485 19.7207 4.27922C18.0151 2.57359 15.2497 2.57359 13.5441 4.27922L12 5.82338" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const VISIBILITY_OPTIONS = [
    { value: 'public', label: 'Public', icon: <PublicIcon />, desc: 'Everyone can watch' },
    { value: 'unlisted', label: 'Unlisted', icon: <UnlistedIcon />, desc: 'Anyone with the link' },
    { value: 'private', label: 'Private', icon: <PrivateIcon />, desc: 'Only you can watch' },
];

const ChevronDown = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M6 9l6 6 6-6" />
    </svg>
);

export default function EditPage() {
    useEffect(() => {
          document.title = "Channel Content - FanTube Studio";
      }, []);
      
    const navigate = useNavigate();
    const { videoId } = useParams();
    const { user } = useAuth();

    const [video, setVideo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [thumbnailFile, setThumbnailFile] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(null);
    const [tagInput, setTagInput] = useState('');
    const [userPlaylists, setUserPlaylists] = useState([]);
    const [visDropOpen, setVisDropOpen] = useState(false);

    const [form, setForm] = useState({
        title: '',
        description: '',
        visibility: 'public',
        commentsEnabled: true,
        tags: [],
        category: '',
        playlistIds: [],
    });

    const [original, setOriginal] = useState(null);

    useEffect(() => {
        const getVideoInfo = async () => {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }
            try {
                const res = await fetch(`${API}/videos/${videoId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok && data.video) {
                    setVideo(data.video);
                    const f = {
                        title: data.video.title || '',
                        description: data.video.description || '',
                        visibility: data.video.visibility || 'public',
                        commentsEnabled: data.video.commentsEnabled ?? true,
                        tags: data.video.tags || [],
                        category: data.video.category || '',
                        playlistIds: [],
                    };
                    setForm(f);
                    setOriginal(f);
                }
            } catch (err) {
                setError('Failed to load video');
            } finally {
                setLoading(false);
            }
        };

        const getPlaylists = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await fetch(`${API}/playlists/my`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) setUserPlaylists(data.playlists || []);
            } catch (err) { console.error(err); }
        };

        getVideoInfo();
        getPlaylists();
    }, [videoId]);

    useEffect(() => {
        const handler = () => setVisDropOpen(false);
        if (visDropOpen) document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [visDropOpen]);

    useEffect(() => {
        if (!success) return;
        const t = setTimeout(() => setSuccess(''), 3000);
        return () => clearTimeout(t);
    }, [success]);

    const hasChanges = JSON.stringify(form) !== JSON.stringify(original) || thumbnailFile;

    const handleUndo = () => {
        setForm(original);
        setThumbnailFile(null);
        setThumbnailPreview(null);
    };

    const handleThumbnailChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setThumbnailFile(file);
            setThumbnailPreview(URL.createObjectURL(file));
        }
    };

    const handleAddTag = (e) => {
        if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
            e.preventDefault();
            const tag = tagInput.trim().replace(/,$/, '');
            if (!form.tags.includes(tag)) {
                setForm(f => ({ ...f, tags: [...f.tags, tag] }));
            }
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag) => {
        setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
    };

    const handlePlaylistToggle = (id) => {
        setForm(f => ({
            ...f,
            playlistIds: f.playlistIds.includes(id)
                ? f.playlistIds.filter(p => p !== id)
                : [...f.playlistIds, id]
        }));
    };

    const handleSave = async () => {
        if (!form.title.trim()) { setError('Title is required'); return; }
        setSaving(true);
        setError('');
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('title', form.title);
        formData.append('description', form.description);
        formData.append('visibility', form.visibility);
        formData.append('commentsEnabled', form.commentsEnabled);
        formData.append('tags', JSON.stringify(form.tags));
        formData.append('category', form.category);
        formData.append('playlistIds', JSON.stringify(form.playlistIds));
        if (thumbnailFile) formData.append('thumbnail', thumbnailFile);
        try {
            const res = await fetch(`${API}/videos/update/${videoId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess('Saved');
                setOriginal(form);
                setThumbnailFile(null);
            } else {
                setError(data.error || 'Save failed');
            }
        } catch (err) {
            setError('Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="ep-loading">Loading...</div>;
    if (!video) return <ErrorPage />;

    const thumbSrc = thumbnailPreview || (video.thumbnail?.url ? `http://localhost:5001${video.thumbnail.url}` : null);
    const selectedVis = VISIBILITY_OPTIONS.find(o => o.value === form.visibility);

    return (
        <div className="ep-page">
            {/* Header */}
            <div className="ep-header">
                <h1 className="ep-title">Video details</h1>
                <div className="ep-header-actions">
                    {success && (
                        <span className="ep-saved-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                            {success}
                        </span>
                    )}
                    <button className="ep-btn-undo" onClick={handleUndo} disabled={!hasChanges}>
                        Undo changes
                    </button>
                    <button className="ep-btn-save" onClick={handleSave} disabled={saving || !hasChanges}>
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button className="ep-btn-more">⋮</button>
                </div>
            </div>

            {error && <div className="ep-error">{error}</div>}

            <div className="ep-body">
                {/* ── LEFT COLUMN ── */}
                <div className="ep-left">

                    {/* Title */}
                    <div className="ep-card">
                        <label className="ep-label">
                            Title (required)
                            <span className="ep-hint" title="Required">?</span>
                        </label>
                        <input
                            className="ep-input"
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            maxLength={100}
                            placeholder="Add a title that describes your video"
                        />
                        <span className="ep-char-count">{form.title.length}/100</span>
                    </div>

                    {/* Description */}
                    <div className="ep-card">
                        <label className="ep-label">
                            Description
                            <span className="ep-hint" title="Optional">?</span>
                        </label>
                        <textarea
                            className="ep-textarea"
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            maxLength={5000}
                            placeholder="Tell viewers about your video (type @ to mention a channel)"
                            rows={8}
                        />
                        <span className="ep-char-count">{form.description.length}/5000</span>
                    </div>

                    {/* Thumbnail */}
                    <div className="ep-card">
                        <label className="ep-label">Thumbnail</label>
                        <p className="ep-sublabel">Set a thumbnail that stands out and draws viewers' attention.</p>
                        <div className="ep-thumb-row">
                            {thumbSrc && (
                                <div className="ep-thumb-current">
                                    <img src={thumbSrc} alt="thumbnail" />
                                    <span className="ep-thumb-badge">Current</span>
                                </div>
                            )}
                            <label className="ep-thumb-upload" htmlFor="thumb-input">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                <span>Upload thumbnail</span>
                                <span className="ep-thumb-fmt">JPG, PNG, GIF — max 2MB</span>
                                <input id="thumb-input" type="file" accept="image/*" onChange={handleThumbnailChange} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>

                    {/* Playlists */}
                    <div className="ep-card">
                        <label className="ep-label">Playlists</label>
                        <p className="ep-sublabel">Add your video to one or more playlists to organise your viewers.</p>
                        {userPlaylists.length === 0 ? (
                            <p className="ep-empty">No playlists yet. <a href="/playlists/new" className="ep-link">Create one</a></p>
                        ) : (
                            <div className="ep-playlist-list">
                                {userPlaylists.map(pl => (
                                    <label key={pl.id} className={`ep-playlist-item ${form.playlistIds.includes(pl.id) ? 'checked' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={form.playlistIds.includes(pl.id)}
                                            onChange={() => handlePlaylistToggle(pl.id)}
                                        />
                                        <span>{pl.name}</span>
                                        {form.playlistIds.includes(pl.id) && (
                                            <svg className="ep-check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                                        )}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tags */}
                    <div className="ep-card">
                        <label className="ep-label">Tags</label>
                        <p className="ep-sublabel">Tags help viewers find your video. Press Enter or comma to add.</p>
                        <div className="ep-tags-box">
                            {form.tags.map(tag => (
                                <span key={tag} className="ep-tag">
                                    {tag}
                                    <button onClick={() => handleRemoveTag(tag)} aria-label="remove tag">×</button>
                                </span>
                            ))}
                            <input
                                className="ep-tag-input"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={handleAddTag}
                                placeholder={form.tags.length === 0 ? 'Add a tag...' : ''}
                            />
                        </div>
                        <span className="ep-char-count">{form.tags.length} tag{form.tags.length !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Category */}
                    <div className="ep-card">
                        <label className="ep-label">Category</label>
                        <p className="ep-sublabel">Add your video to a category so viewers can find it more easily.</p>
                        <select
                            className="ep-select"
                            value={form.category}
                            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        >
                            <option value="">Select a category</option>
                            {CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Comments */}
                    <div className="ep-card">
                        <label className="ep-label">Comments</label>
                        <div className="ep-toggle-row">
                            <div>
                                <p className="ep-toggle-title">Allow comments</p>
                                <p className="ep-sublabel" style={{ margin: 0 }}>Viewers can comment on your video.</p>
                            </div>
                            <button
                                className={`ep-toggle ${form.commentsEnabled ? 'on' : 'off'}`}
                                onClick={() => setForm(f => ({ ...f, commentsEnabled: !f.commentsEnabled }))}
                                aria-label="Toggle comments"
                            >
                                <span className="ep-toggle-knob" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT COLUMN ── */}
                <div className="ep-right">

                    {/* Video Preview */}
                    <div className="ep-preview-card">
                        <video
                            src={`http://localhost:5001${video.url}`}
                            poster={thumbSrc}
                            controls
                            className="ep-preview-video"
                        />
                        <div className="ep-preview-info">
                            <p className="ep-preview-link-label">Video link</p>
                            <div className="ep-preview-link-row">
                                <a
                                    href={`/watch/${videoId}`}
                                    className="ep-preview-link"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {`${window.location.origin}/watch/${videoId}`}
                                </a>
                                <button
                                    className="ep-copy-btn"
                                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/watch/${videoId}`)}
                                    title="Copy link"
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Visibility — YouTube style dropdown */}
                    <div className="ep-side-card">
                        <label className="ep-label">Visibility</label>
                        <div className="ep-vis-dropdown" onClick={e => { e.stopPropagation(); setVisDropOpen(o => !o); }}>
                            <div className="ep-vis-selected">
                                <span className="ep-vis-icon">{selectedVis?.icon}</span>
                                <span className="ep-vis-label">{selectedVis?.label}</span>
                                <span className={`ep-vis-chevron ${visDropOpen ? 'open' : ''}`}><ChevronDown /></span>
                            </div>
                            {visDropOpen && (
                                <div className="ep-vis-options" onClick={e => e.stopPropagation()}>
                                    {VISIBILITY_OPTIONS.map(opt => (
                                        <div
                                            key={opt.value}
                                            className={`ep-vis-option ${form.visibility === opt.value ? 'selected' : ''}`}
                                            onClick={() => { setForm(f => ({ ...f, visibility: opt.value })); setVisDropOpen(false); }}
                                        >
                                            <span className="ep-vis-icon">{opt.icon}</span>
                                            <div>
                                                <p className="ep-vis-option-label">{opt.label}</p>
                                                <p className="ep-vis-option-desc">{opt.desc}</p>
                                            </div>
                                            {form.visibility === opt.value && (
                                                <svg className="ep-vis-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Restrictions */}
                    <div className="ep-side-card">
                        <label className="ep-label">Restrictions</label>
                        <p className="ep-sublabel" style={{ marginTop: 6, marginBottom: 0 }}>None</p>
                    </div>
                </div>
            </div>
        </div>
    );
}