import { Link, useLocation } from 'react-router-dom';
import home from './assets/home.svg';
import downloads from './assets/downloads.svg';
import profile from './assets/profile.svg';
import explore from './assets/explore.svg';
import music from './assets/youtube-music.svg';
import subs from './assets/subscription.png';
import './Sidebar.css'

export default function Sidebar() {
    const location = useLocation();

    const sidebarItems = [
        { icon: home, label: 'Home', path: '/', id: 'home' },
        { icon: explore, label: 'Explore', path: '/explore', id: 'explore' },
        { icon: subs, label: 'Subscriptions', path: '/subscriptions', id: 'subs' },
        // { icon: music, label: 'Music', path: '/music', id: 'ytmusic' },
        { icon: profile, label: 'You', path: '/you', id: 'profile' },
    ];

    return (
        <div className="shelf">
            {sidebarItems.map((item) => (
                <Link 
                    to={item.path} 
                    key={item.id}
                    className={`sidebar-items ${location.pathname === item.path ? 'active' : ''}`}
                >
                    <img className="sidebar-icons" src={item.icon} alt={item.label} id={item.id} />
                    <span className="sidebar-label">{item.label}</span>
                </Link>
            ))}
        </div>
    );
}