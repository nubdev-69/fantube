import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { timeAgo } from "../../assets/utils/format";
import like from "./assets/like.png";
import dislike from "./assets/dislike.png";
import more from "./assets/more.png";
import del from "./assets/delete.png";


const API = 'http://localhost:5001';

export default function Comments({ comments, onUpdate }) {
    const {videoId}=useParams();
    const [inter, setInter] = useState(null);

    useEffect(() => {
        const getUserInteraction = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const response = await fetch(`${API}/api/comments/${videoId}/interaction`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                const data = await response.json();
                setInter(data.data);
            } catch (error) {
                console.log(error);
            }
        }
        getUserInteraction();

    }, [videoId])

    const topLevel = comments.filter(c => !c.replyId);
    return (
        <>
            {topLevel.map(comment => (
                <CommentItem
                    key={comment.id}
                    comment={comment}
                    onUpdate={onUpdate}
                    allComments={comments}
                    inter={inter && inter}
                    depth={0}
                />
            ))}
        </>
    );
}

function CommentItem({ comment, onUpdate, allComments, inter, depth }) {
    const navigate = useNavigate();
    const { videoId } = useParams();
    const { user } = useAuth();
    const [showReplies, setShowReplies] = useState(false);
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [likes, setLikes] = useState(comment.likes || 0);
    const [dislikes, setDislikes] = useState(comment.dislikes || 0);

    const [interaction, setInteraction] = useState(null); // 'like' | 'dislike' | null

    const replies = allComments.filter(c => c.replyId === comment.id);


    // ✅ always reply under top-level parent — max 1 level deep
    const getParentId = (c) => c.replyId || c.id;

    useEffect(() => {
        if (!inter) return;
        setInteraction(inter.find(item => item.id == comment.id)?.type); // 'like' or 'dislike'
    }, [inter, comment.id]);

    const handleInteraction = async (type) => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        const prev = interaction;
        const newInt = prev === type ? null : type;

        // optimistic update
        setInteraction(newInt);
        if (prev === 'like') setLikes(l => l - 1);
        if (prev === 'dislike') setDislikes(d => d - 1);
        if (newInt === 'like') setLikes(l => l + 1);
        if (newInt === 'dislike') setDislikes(d => d + 1);

        try {
            const res = await fetch(`${API}/api/comments/${videoId}/${comment.id}/interaction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ interaction: newInt })
            });
            const data = await res.json();
            if (res.ok) setInteraction(data.interaction);
        } catch {
            // revert on error
            setInteraction(prev);
            if (prev === 'like') setLikes(l => l + 1);
            if (prev === 'dislike') setDislikes(d => d + 1);
            if (newInt === 'like') setLikes(l => l - 1);
            if (newInt === 'dislike') setDislikes(d => d - 1);
        }
    };

    const handleReply = async () => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        if (!replyText.trim()) return;

        const res = await fetch(`${API}/api/videos/${videoId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                text: replyText,
                replyId: getParentId(comment)
            })
        });

        if (res.ok) {
            setReplyText('');
            setShowReplyInput(false);
            setShowReplies(true);
            onUpdate();
        }
    };
    const handleDelete = async(id) => {
        const token=localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        try{
            const res=await fetch(`${API}/api/comments/${id}`,{
                method:'DELETE',
                headers:{
                    'Authorization': `Bearer ${token}`
                }
            });
            if(res.ok){
                onUpdate();
            }
        }catch(err){
            console.error('Delete failed', err);
        }
    }

    return (
        <div className={`comments-container ${depth > 0 ? 'comment-is-reply' : ''}`}>
            {/* Avatar */}
            <div className="comment-user-avatar-container">
                <img
                    src={comment.user?.avatar ? `${API}${comment.user.avatar}` : '/default-avatar.png'}
                    alt={comment.user?.name}
                    className="comment-user-avatar"
                    onClick={() => navigate(`/channel/${comment.user?.handle}`)}
                    onError={e => e.target.src = '/default-avatar.png'}
                />
            </div>

            {/* Body */}
            <div className="user-comment-container">
                {/* Name + time */}
                <div className="user-comment-info">
                    <p
                        className="comment-user-name"
                        onClick={() => navigate(`/channel/${comment.user?.handle}`)}
                    >
                        @{comment.user?.handle}
                    </p>
                    <p className="comment-time">{timeAgo(comment.publishedAt)}</p>
                </div>

                {/* Text */}
                <div className="user-comment">{comment.text}</div>

                {/* Like / Dislike / Reply */}
                <div className="user-comment-meta">
                    <div
                        className={`like-comment ${interaction === 'like' ? 'active' : ''}`}
                        onClick={() => handleInteraction('like')}
                    >
                        <img
                            src={like}
                            alt="Like"
                            className="like-comment-img"
                            style={{ filter: interaction === 'like' ? 'invert(40%) sepia(100%) saturate(500%) hue-rotate(200deg)' : 'none' }}
                        />
                        {likes > 0 && <span className="comment-like-count">{likes}</span>}
                    </div>

                    <div
                        className={`dislike-comment ${interaction === 'dislike' ? 'active' : ''}`}
                        onClick={() => handleInteraction('dislike')}
                    >
                        <img
                            src={dislike}
                            alt="Dislike"
                            className="dislike-comment-img"
                            style={{ filter: interaction === 'dislike' ? 'invert(40%) sepia(100%) saturate(500%) hue-rotate(200deg)' : 'none' }}
                        />
                    </div>

                    {/* Reply only on top-level */}
                    {depth === 0 && (
                        <div
                            className="reply-comment"
                            onClick={() => setShowReplyInput(r => !r)}
                        >
                            Reply
                        </div>
                    )}
                </div>

                {/* Reply input */}
                {showReplyInput && (
                    <div className="comment-reply-input-wrapper">
                        <img
                            src={user?.pfp ? `${API}${user.pfp}` : '/default-avatar.png'}
                            alt="you"
                            className="comment-user-avatar"
                            onError={e => e.target.src = '/default-avatar.png'}
                        />
                        <div className="reply-input-inner">
                            <input
                                type="text"
                                placeholder={`Reply to @${comment.user?.id}...`}
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleReply()}
                                className="reply-input"
                                autoFocus
                            />
                            <div className="reply-input-actions">
                                <button
                                    className="comment-cancel"
                                    onClick={() => { setShowReplyInput(false); setReplyText(''); }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="comment-submit"
                                    disabled={!replyText.trim()}
                                    onClick={handleReply}
                                >
                                    Reply
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* View replies toggle */}
                {replies.length > 0 && depth === 0 && (
                    <button
                        className="comment-show-replies"
                        onClick={() => setShowReplies(r => !r)}
                    >
                        <svg
                            width="14" height="14" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2.5"
                            style={{ transform: showReplies ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
                        >
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                        {showReplies ? 'Hide' : 'View'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                    </button>
                )}

                {/* Replies */}
                {showReplies && replies.map(reply => (
                    <CommentItem
                        key={reply.id}
                        comment={reply}
                        videoId={videoId}
                        onUpdate={onUpdate}
                        allComments={allComments}
                        inter={inter}
                        depth={1}
                    />
                ))}
            </div>

            {/* More */}
            <div className="user-comment-more-container">
                {
                    comment.user.id===user.id?
                    <img src={del} alt='' className='user-comment-del' onClick={() => handleDelete(comment.id)}/>
                    :
                    <img src={more} alt="" className='user-comment-more'/>
                }
            </div>
        </div>
    );
}