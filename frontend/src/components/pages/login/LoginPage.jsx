import { useState,useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../../../services/auth';
import './LoginPage.css';
import { useAuth } from '../../../context/AuthContext';

export default function LoginPage() {
    useEffect(() => {
              document.title = "Login - FanTube";
          }, []);
    const navigate = useNavigate();
    const { login } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        userId: '',
        name: '',
        email: '',
        password: '',
    });
    const [pfpFile, setPfpFile] = useState(null);
    const [pfpPreview, setPfpPreview] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePfpChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPfpFile(file);
            setPfpPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let result;
            if (isLogin) {
                result = await AuthService.login(formData.email, formData.password);
            } else {
                const data = new FormData();
                data.append('userId', formData.userId);
                data.append('name', formData.name);
                data.append('email', formData.email);
                data.append('password', formData.password);
                if (pfpFile) data.append('pfp', pfpFile);

                result = await AuthService.register(data);
            }

            if (result.success) {
                login(result.user);
                navigate('/');
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Something went wrong. Please try again.',err);
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthLogin = (provider) => {
        window.location.href = `http://localhost:5001/api/auth/${provider}`;
    };

    // Clean up preview URL to avoid memory leaks
    const handleRemovePfp = () => {
        if (pfpPreview) URL.revokeObjectURL(pfpPreview);
        setPfpFile(null);
        setPfpPreview(null);
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
                        <p>{isLogin ? 'Sign in to continue' : 'Sign up to get started'}</p>
                    </div>

                    {error && (
                        <div className="error-banner">
                            <span>⚠️</span>
                            <p>{error}</p>
                        </div>
                    )}

                    {/* OAuth Buttons */}
                    <div className="oauth-buttons">
                        <button
                            className="oauth-btn google-btn"
                            onClick={() => handleOAuthLogin('google')}
                            type="button"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Continue with Google
                        </button>

                        <button
                            className="oauth-btn twitter-btn"
                            onClick={() => handleOAuthLogin('twitter')}
                            type="button"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            Continue with X
                        </button>
                    </div>

                    <div className="divider"><span>OR</span></div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {!isLogin && (
                            <>
                                <div className="form-group pfp-group">
                                    <label>Profile Picture <span>(optional)</span></label>
                                    <div className="pfp-upload-wrapper">
                                        <img
                                            src={pfpPreview || '/user/avatar/udefault.png'}
                                            alt="Profile preview"
                                            className="pfp-preview"
                                        />
                                        <div className="pfp-actions">
                                            <label htmlFor="pfp" className="pfp-upload-btn">
                                                {pfpPreview ? 'Change' : 'Upload Photo'}
                                            </label>
                                            {pfpPreview && (
                                                <button
                                                    type="button"
                                                    className="pfp-remove-btn"
                                                    onClick={handleRemovePfp}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            id="pfp"
                                            name="pfp"
                                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                            onChange={handlePfpChange}
                                            style={{ display: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="userId">User ID</label>
                                    <input
                                        type="text"
                                        id="userId"
                                        name="userId"
                                        value={formData.userId}
                                        onChange={handleChange}
                                        placeholder="your-id"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="name">Name</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Enter your name"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter your email"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                required
                                minLength="6"
                            />
                        </div>

                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={loading}
                        >
                            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
                        </button>
                    </form>

                    <div className="toggle-form">
                        <p>
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <button type="button" onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                                handleRemovePfp(); // reset pfp when switching forms
                            }}>
                                {isLogin ? 'Sign Up' : 'Sign In'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}