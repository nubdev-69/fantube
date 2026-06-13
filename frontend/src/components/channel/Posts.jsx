import { useState } from 'react';
import './Posts.css';

export default function Posts() {
    const [likedPosts, setLikedPosts] = useState({});
    const [commentText, setCommentText] = useState({});

    // Sample posts data
    const posts = [
        {
            id: 1,
            content: "Excited to announce our new series coming this February! 🎬✨ What are you most looking forward to?",
            image: dune,
            timestamp: "2 days ago",
            likes: 1234,
            comments: 89
        },
        {
            id: 2,
            content: "Behind the scenes from our latest shoot! The team worked incredibly hard to bring this vision to life. Thank you to everyone involved! 🙏",
            image: null,
            timestamp: "5 days ago",
            likes: 2567,
            comments: 143
        },
        {
            id: 3,
            content: "New episode drops tomorrow at 9 PM! Who's ready? Drop a 🔥 in the comments if you can't wait!",
            image: dune,
            timestamp: "1 week ago",
            likes: 3891,
            comments: 256
        },
        {
            id: 4,
            content: "Thank you for 2M subscribers! 🎉 We couldn't have done it without your amazing support. Here's to many more milestones together! ❤️",
            image: dune,
            timestamp: "2 weeks ago",
            likes: 5234,
            comments: 412
        }
    ];

    const handleLike = (postId) => {
        setLikedPosts(prev => ({
            ...prev,
            [postId]: !prev[postId]
        }));
    };

    const handleComment = (postId) => {
        console.log(`Comment on post ${postId}:`, commentText[postId]);
        setCommentText(prev => ({
            ...prev,
            [postId]: ''
        }));
    };

    return (
        <div className="channel-posts">
            {posts.map((post) => (
                <div className="post-card" key={post.id}>
                    <div className="post-header">
                        <div className="post-author-info">
                            <div className="post-avatar">
                                <img src={dune} alt="Channel avatar" className="post-avatar-img" />
                            </div>
                            <div className="post-author-details">
                                <span className="post-author-name">Channel Name</span>
                                <span className="post-timestamp">{post.timestamp}</span>
                            </div>
                        </div>
                        <img src={more} alt="more" className="post-more-button" />
                    </div>

                    <div className="post-content">
                        <p className="post-text">{post.content}</p>
                        {post.image && (
                            <div className="post-image-container">
                                <img src={post.image} alt="Post" className="post-image" />
                            </div>
                        )}
                    </div>

                    <div className="post-stats">
                        <span className="post-stat">
                            👍 {likedPosts[post.id] ? post.likes + 1 : post.likes}
                        </span>
                        <span className="post-stat">{post.comments} comments</span>
                    </div>

                    <div className="post-actions">
                        <button 
                            className={`post-action-btn ${likedPosts[post.id] ? 'liked' : ''}`}
                            onClick={() => handleLike(post.id)}
                        >
                            <span className="action-icon">👍</span>
                            <span className="action-text">Like</span>
                        </button>
                        <button className="post-action-btn">
                            <span className="action-icon">💬</span>
                            <span className="action-text">Comment</span>
                        </button>
                        <button className="post-action-btn">
                            <span className="action-icon">↗</span>
                            <span className="action-text">Share</span>
                        </button>
                    </div>

                    <div className="post-comment-section">
                        <div className="comment-input-container">
                            <div className="comment-avatar">
                                <img src={dune} alt="Your avatar" className="comment-avatar-img" />
                            </div>
                            <input 
                                type="text" 
                                placeholder="Add a comment..."
                                className="comment-input"
                                value={commentText[post.id] || ''}
                                onChange={(e) => setCommentText(prev => ({
                                    ...prev,
                                    [post.id]: e.target.value
                                }))}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') handleComment(post.id);
                                }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}