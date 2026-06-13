import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import './Profile.css';

const API = 'http://localhost:5001';

export default function Profile() {
    useEffect(() => {
          document.title = "Profile - FanTube";
      }, []);
    const navigate = useNavigate();
    const { user, login } = useAuth();

    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [form, setForm] = useState({
        name: '',
        userId: '',
    });
    const [pfpFile, setPfpFile] = useState(null);
    const [pfpPreview, setPfpPreview] = useState(null);
    const fileRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        if (user) {
            setForm({ name: user.name || '', userId: user.userId || '' });
        }
    }, [user]);

    const handlePfpChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPfpFile(file);
            setPfpPreview(URL.createObjectURL(file));
        }
    };

    useEffect(() => {
        if (!success) return;
        const timer = setTimeout(() => setSuccess(''), 5000);
        return () => clearTimeout(timer);
    }, [success]);

    const handleSave = async () => {
        setError('');
        setSuccess('');
        setLoading(true);

        const token = localStorage.getItem('token');
        const data = new FormData();
        data.append('name', form.name);
        data.append('userId', form.userId);
        if (pfpFile) data.append('pfp', pfpFile);

        try {
            const res = await fetch(`${API}/api/auth/profile`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: data
            });
            const result = await res.json();
            if (res.ok) {
                // ✅ update localStorage so data persists on refresh
                const updatedUser = result.user;
                localStorage.setItem('user', JSON.stringify(updatedUser));
                console.log(updatedUser);

                login(updatedUser);
                setSuccess('Profile updated!');
                setEditing(false);
                setPfpFile(null);
                setPfpPreview(null);

                // ✅ update form with new values
                setForm({ name: updatedUser.name, userId: updatedUser.userId });
            } else {
                setError(result.error || 'Update failed');
            }
        } catch (err) {
            setError('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setEditing(false);
        setError('');
        setForm({ name: user?.name || '', userId: user?.userId || '' });
        setPfpFile(null);
        setPfpPreview(null);
    };

    const pfpUrl = pfpPreview || (user?.pfp
        ? `${API}${user.pfp}`
        : '/default-avatar.png');

    const joinDate = user?.createdAt        
        ? new Date(user.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : null;

    const hasChanges =
        form.name !== (user?.name || '') ||
        form.userId !== (user?.userId || '') ||
        pfpFile !== null;

    return (
        <div className="profile-page">
            <div className="profile-card">

                {/* Banner */}
                <div className="profile-banner">
                    <div className="profile-banner-noise" />
                </div>

                {/* Avatar */}
                <div className="profile-avatar-wrapper">
                    <div className="profile-avatar-ring">
                        <img src={pfpUrl} alt={user?.name} className="profile-avatar-img" />
                    </div>
                    {editing && (
                        <>
                            <button className="profile-avatar-change" onClick={() => fileRef.current.click()}>
                                Change Photo
                            </button>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePfpChange}
                                style={{ display: 'none' }}
                            />
                        </>
                    )}
                </div>

                {/* Info */}
                <div className="profile-body">
                    {error && <div className="profile-error">{error}</div>}
                    {success && <div className="profile-success">{success}</div>}

                    {editing ? (
                        <div className="profile-edit-form">
                            <div className="profile-field">
                                <label>Display Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="Your name"
                                />
                            </div>
                            <div className="profile-field">
                                <label>Handle</label>
                                <div className="profile-handle-input">
                                    <span>@</span>
                                    <input
                                        type="text"
                                        value={form.userId}
                                        onChange={e => setForm({ ...form, userId: e.target.value })}
                                        placeholder="your-handle"
                                    />
                                </div>
                            </div>
                            <div className="profile-edit-actions">
                                <button className="profile-btn-cancel" onClick={handleCancel}>Cancel</button>
                                <button className="profile-btn-save" onClick={handleSave} disabled={loading || !hasChanges} >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="profile-display">
                            <h2 className="profile-display-name">{user?.name}</h2>
                            <p className="profile-display-handle">@{user?.userId}</p>
                            <p className="profile-display-email">{user?.email}</p>
                            {joinDate && (
                                <p className="profile-display-joined">Joined {joinDate}</p>
                            )}
                            <div className="profile-actions">
                                <button className="profile-btn-customize" onClick={() => setEditing(true)}>
                                    Customize Profile
                                </button>
                                <button className="profile-btn-password" onClick={() => navigate('/account/password')}>
                                    Change Password
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}