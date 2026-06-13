import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

export default function OAuthCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();

    useEffect(() => {
        const token = searchParams.get('token');
        const userStr = searchParams.get('user');

        if (token && userStr) {
            try {
                const user = JSON.parse(decodeURIComponent(userStr));

                // ✅ save to localStorage — same as normal login
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));

                login(user);         // update context
                navigate('/');       // go to home
            } catch {
                navigate('/login?error=parse_failed');
            }
        } else {
            navigate('/login?error=oauth_failed');
        }
    }, []);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <p>Signing you in...</p>
        </div>
    );
}