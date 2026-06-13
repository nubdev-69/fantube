import { useNavigate, useParams } from "react-router";
import Comments from "./Comments";
import emoji from "./assets/emoji.png";
import sort from './assets/sort.png';
import { useEffect, useState, useRef } from "react";
import { useAuth } from '../../context/AuthContext';

const API = 'http://localhost:5001';

export default function Comment() {
    const { videoId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [submit, setSubmit] = useState(false);
    const [comments, setComments] = useState([]);
    const [text, setText] = useState("");
    const [focused, setFocused] = useState(false);
    const [error, setError] = useState("");
    const textAreaRef = useRef(null);

    useEffect(() => {
        fetch(`${API}/api/videos/${videoId}/comments`)
            .then(res => res.json())
            .then(data => setComments(data.comments || []));
    }, [videoId, submit]);

    const handleChange = (e) => {
        setText(e.target.value);
        const el = textAreaRef.current;
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
    };

    const handleBlur = () => {
        if (!text.trim()) {
            setFocused(false);
            textAreaRef.current.style.height = "auto";
        }
    };

    const handleComment = async () => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        const response = await fetch(`${API}/api/videos/${videoId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text, replyId: null })
        });

        const data = await response.json();
        if (response.ok) {
            setText("");
            setSubmit(s => !s);
            setFocused(false);
            setError("");
        } else {
            setError(data.error || 'Failed to post comment');
        }
    };

    const topLevelCount = comments.filter(c => !c.replyId).length;

    return (
        <div className="comments-section">
            <div className="comment-header">
                <h4 className="comment-count">{topLevelCount} Comments</h4>
                <div className="comment-filter-container">
                    <img src={sort} alt="" className="sort-img" />
                    <p className="sort-text">Sort by</p>
                </div>
            </div>

            <div className="new-comment-container">
                <div className="user-avatar-container">
                    <img
                        src={user?.pfp ? `${API}${user.pfp}` : '/default-avatar.png'}
                        alt="User"
                        className="user-avatar"
                        onError={e => e.target.src = '/default-avatar.png'}
                    />
                </div>
                <div className="comment-textarea">
                    <textarea
                        placeholder="Add a comment..."
                        value={text}
                        ref={textAreaRef}
                        onFocus={() => setFocused(true)}
                        onChange={handleChange}
                        className="comment-input"
                        rows={1}
                        onBlur={handleBlur}
                    />
                    {focused && (
                        <div className="comment-actions-container">
                            <div className="emoji-btn">
                                <img src={emoji} alt="Add Emoji" className="emoji-img" />
                            </div>
                            <div className="comment-actions">
                                <button
                                    className="comment-cancel"
                                    onClick={() => { setText(""); setFocused(false); }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="comment-submit"
                                    disabled={!text.trim()}
                                    onClick={handleComment}
                                >
                                    Comment
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {error && <p className="comment-error">{error}</p>}

            <Comments
                comments={comments}
                onUpdate={() => setSubmit(s => !s)}
            />
        </div>
    );
}