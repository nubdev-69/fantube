import { useNavigate } from 'react-router-dom';
import AuthService from '../../services/auth';
import './ProfileSidebar.css';

export default function ProfileSidebar({ isOpen, onClose, userInfo }) {
    const navigate = useNavigate();
    if (!isOpen) return null;

    const handleSignOut = () => {
        AuthService.logout();   // clears localStorage
        onClose();
        navigate('/login');
        window.location.reload(); // reset all state
    };

    const handleNav = (path) => {
        onClose();
        navigate(path);
    };

    return (
        <>
            <div className="profile-sidebar-backdrop" onClick={onClose} />

            <div className="profile-sidebar">
                {/* Header */}
                <div className="profile-sidebar-header">
                    <div className="profile-user-info">
                        <img
                            src={`http://localhost:5001${userInfo.pfp}`|| '/default-avatar.png'}  // ✅ was avatar, now pfp
                            alt="User"
                            className="profile-sidebar-avatar"
                        />
                        <div className="profile-user-details">
                            <h3 className="profile-user-name">{userInfo?.name || 'User'}</h3>
                            <p className="profile-user-email">{userInfo?.email || ''}</p>
                            <button
                                className="profile-manage-link"
                                onClick={() => handleNav('/profile')}
                            >
                                Manage your Account
                            </button>
                        </div>
                    </div>
                </div>

                <div className="profile-sidebar-divider" />

                <div className="profile-sidebar-menu">
                    <MenuItem icon="👤" label="Your channel"   onClick={() => handleNav(`/channel/${userInfo?.userId}`)} />
                    <MenuItem icon="▶"  label="Your Studio"    onClick={() => handleNav('/studio')} />
                </div>

                {/* <div className="profile-sidebar-divider" /> */}

                <div className="profile-sidebar-menu">
                    <MenuItem icon="📊" label="Your data"                  onClick={() => handleNav('/you')} />
                </div>

                <div className="profile-sidebar-divider" />

                <div className="profile-sidebar-menu">
                    {/* ✅ Sign out now actually works */}
                    <button className="profile-menu-item profile-signout-btn" onClick={handleSignOut}>
                        <span className="profile-menu-icon">🚪</span>
                        <span>Sign out</span>
                    </button>
                </div>
            </div>
        </>
    );
}

function MenuItem({ icon, label, onClick }) {
    return (
        <button className="profile-menu-item" onClick={onClick}>
            <span className="profile-menu-icon">{icon}</span>
            <span>{label}</span>
        </button>
    );
}