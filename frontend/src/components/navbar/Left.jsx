import menu from'./assets/menu.svg';
import { Link } from 'react-router';
import logo from './assets/fantube-logo.png';
export default function Left(){
    return(
        <div className="left">
            <button id="menu"> <img className="menu-icon" src={menu} /></button>
            <Link to="/" className="vid-link">
                 <img className="yt-logo" src={logo} />
            </Link>
        </div>
    );
}