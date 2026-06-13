import Left from './Left.jsx';
import Mid from './Mid.jsx';
import Right from './Right.jsx';
import './Navbar.css'
export default function Navbar(){
    return(
        <div className='menu'>
            <Left />
            <Mid />
            <Right />
        </div>
    )
}