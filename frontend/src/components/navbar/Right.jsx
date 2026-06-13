import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import plus from './assets/plus.svg';
import notification from "./assets/notification-icon.svg";
import ProfileSidebar from './ProfileSidebar';
import CreateModal from './CreateModal';

export default function Right() {
    const navigate = useNavigate();
    const { user } = useAuth();  // ✅ live auth state, auto-updates on login/logout
    const [showProfileSidebar, setShowProfileSidebar] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const handleCreateClick = () => {
        if (!user) navigate('/login');
        else setShowCreateModal(true);
    };

    const handleProfileClick = () => {
        if (!user) navigate('/login');
        else setShowProfileSidebar(!showProfileSidebar);
    };
    return (
        <>
            <div className="right">
                <div className="create" onClick={handleCreateClick}>
                    <img className="plus" src={plus} alt="Create" />
                    <p id="create">Create</p>
                </div>

                {/* <div className="notification">
                    <img className="noti" src={notification} alt="Notifications" />
                    <div className="noti-no">3</div>
                </div> */}

                {user ? (
                    <div className="navbar-user" onClick={handleProfileClick}>
                        <img
                            id="user"
                            src={`http://localhost:5001${user.pfp}` || '/user/avatar/udefault.png'}
                            alt={user.name}
                        />
                    </div>
                ) : (
                    <button className="signin-btn" onClick={() => navigate('/login')}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                        Sign In
                    </button>
                )}
            </div>

            {user && (
                <>
                    <ProfileSidebar
                        isOpen={showProfileSidebar}
                        onClose={() => setShowProfileSidebar(false)}
                        userInfo={user}
                    />
                    <CreateModal
                        isOpen={showCreateModal}
                        onClose={() => setShowCreateModal(false)}
                    />
                </>
            )}
        </>
    );
}