import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './UploadPage.css';
import { useAuth } from '../../../context/AuthContext';

export default function UploadPage() {
    useEffect(() => {
          document.title = "Channel Content - FanTube Studio";
      }, []);
    const navigate = useNavigate();
    const location = useLocation();
    const [videoFile, setVideoFile] = useState(null);
    const [thumbnailFile, setThumbnailFile] = useState(null);
    const [videoDetails, setVideoDetails] = useState({
        title: '',
        description: '',
        visibility: 'private',
        category: '',
        tags: '',
        duration: 0
    });
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    // API URL - hardcoded for local development

    // Get video file from navigation state (passed from CreateModal)
    useEffect(() => {
        if (location.state?.videoFile) {
            setVideoFile(location.state.videoFile);
        }
    }, [location.state]);

    // Get video duration when file is loaded
    useEffect(() => {
        if (videoFile) {
            const video = document.createElement('video');
            video.preload = 'metadata';

            video.onloadedmetadata = function () {
                window.URL.revokeObjectURL(video.src);
                const duration = Math.floor(video.duration);
                setVideoDetails(prev => ({
                    ...prev,
                    duration: duration
                }));
            };

            video.onerror = function () {
                console.error('Error loading video metadata');
            };

            video.src = URL.createObjectURL(videoFile);
        }
    }, [videoFile]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setVideoDetails(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleThumbnailChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            setThumbnailFile(file);
        } else {
            alert('Please select a valid image file');
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
    
        if (!videoFile) {
            setError('Please select a video file');
            return;
        }
    
        if (!videoDetails.title.trim()) {
            setError('Title is required');
            return;
        }
    
        setIsUploading(true);
        setError('');
        setUploadProgress(0);
    
        const formData = new FormData();
        formData.append('video', videoFile);
        if (thumbnailFile) formData.append('thumbnail', thumbnailFile);
        formData.append('title', videoDetails.title.trim());
        formData.append('description', videoDetails.description.trim());
        formData.append('visibility', videoDetails.visibility);
        formData.append('category', videoDetails.category);
        formData.append('tags', videoDetails.tags);
        formData.append('duration', videoDetails.duration);
    
        const xhr = new XMLHttpRequest();
    
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                setUploadProgress(percentComplete);
            }
        });
    
        xhr.addEventListener('load', () => {
            setIsUploading(false);
    
            if (xhr.status === 200 || xhr.status === 201) {
                const data = JSON.parse(xhr.responseText);
                alert('Video uploaded successfully!');
                navigate(`/watch/${data.videoId}`);
            } else {
                const error = JSON.parse(xhr.responseText);
                setError(error.message || error.error || 'Upload failed');
            }
        });
    
        xhr.addEventListener('error', () => {
            setIsUploading(false);
            setError('Network error. Is backend running on http://localhost:5001?');
        });
    
        xhr.open('POST', 'http://localhost:5001/api/videos/upload');
        
        // ✅ Set token AFTER open(), BEFORE send()
        const token = localStorage.getItem('token');
        if (!token) {
            setIsUploading(false);
            setError('You must be logged in to upload');
            navigate('/login');
            return;
        }
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    
        xhr.send(formData);
    };

    const handleCancel = () => {
        if (isUploading) {
            alert('Cannot cancel while upload is in progress');
            return;
        }

        if (window.confirm('Are you sure you want to cancel? Your progress will be lost.')) {
            navigate(-1); // Go back
        }
    };

    return (
        <div className="upload-page">
            <div className="upload-container">
                <div className="upload-header">
                    <h1>Upload Video</h1>
                    <button className="close-upload-btn" onClick={handleCancel}>✕</button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="error-message">
                        <span>⚠️</span>
                        <p>{error}</p>
                        <button onClick={() => setError('')}>✕</button>
                    </div>
                )}

                {/* Video Preview Section */}
                <div className="upload-content">
                    <div className="video-preview-section">
                        <div className="preview-card">
                            <div className="preview-thumbnail">
                                {thumbnailFile ? (
                                    <img
                                        src={URL.createObjectURL(thumbnailFile)}
                                        alt="Thumbnail preview"
                                    />
                                ) : (
                                    <div className="no-thumbnail">
                                        <span>📹</span>
                                        <p>No thumbnail</p>
                                    </div>
                                )}
                            </div>
                            <div className="preview-info">
                                <p className="video-filename">
                                    {videoFile?.name || 'No file selected'}
                                </p>
                                {videoFile && (
                                    <>
                                        <p className="video-filesize">
                                            Size: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                        {videoDetails.duration > 0 && (
                                            <p className="video-duration">
                                                Duration: {Math.floor(videoDetails.duration / 60)}:
                                                {String(videoDetails.duration % 60).padStart(2, '0')}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Upload Progress */}
                        {isUploading && (
                            <div className="upload-progress">
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                </div>
                                <p className="progress-text">
                                    {uploadProgress}% uploaded - Please don't close this page
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Details Form */}
                    <div className="details-section">
                        <form onSubmit={handleUpload}>
                            <div className="form-section">
                                <h2>Details</h2>

                                <div className="form-group">
                                    <label htmlFor="title">Title (required) *</label>
                                    <input
                                        type="text"
                                        id="title"
                                        name="title"
                                        value={videoDetails.title}
                                        onChange={handleInputChange}
                                        placeholder="Add a title that describes your video"
                                        maxLength="100"
                                        required
                                        disabled={isUploading}
                                    />
                                    <span className="char-count">{videoDetails.title.length}/100</span>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="description">Description</label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={videoDetails.description}
                                        onChange={handleInputChange}
                                        placeholder="Tell viewers about your video"
                                        rows="6"
                                        maxLength="5000"
                                        disabled={isUploading}
                                    ></textarea>
                                    <span className="char-count">{videoDetails.description.length}/5000</span>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="thumbnail">Thumbnail</label>
                                    <input
                                        type="file"
                                        id="thumbnail"
                                        accept="image/*"
                                        onChange={handleThumbnailChange}
                                        disabled={isUploading}
                                    />
                                    <p className="form-hint">Select or upload a picture that shows what's in your video</p>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="category">Category</label>
                                    <select
                                        id="category"
                                        name="category"
                                        value={videoDetails.category}
                                        onChange={handleInputChange}
                                        disabled={isUploading}
                                    >
                                        <option value="">Select category</option>
                                        <option value="gaming">Gaming</option>
                                        <option value="education">Education</option>
                                        <option value="entertainment">Entertainment</option>
                                        <option value="music">Music</option>
                                        <option value="sports">Sports</option>
                                        <option value="technology">Technology</option>
                                        <option value="vlogs">Vlogs</option>
                                        <option value="health">Health & Fitness</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="tags">Tags</label>
                                    <input
                                        type="text"
                                        id="tags"
                                        name="tags"
                                        value={videoDetails.tags}
                                        onChange={handleInputChange}
                                        placeholder="Add tags separated by commas"
                                        disabled={isUploading}
                                    />
                                    <p className="form-hint">Tags can help people find your video</p>
                                </div>
                            </div>

                            <div className="form-section">
                                <h2>Visibility</h2>

                                <div className="visibility-options">
                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name="visibility"
                                            value="private"
                                            checked={videoDetails.visibility === 'private'}
                                            onChange={handleInputChange}
                                            disabled={isUploading}
                                        />
                                        <div className="radio-content">
                                            <span className="radio-title">Private</span>
                                            <span className="radio-description">Only you can see this video</span>
                                        </div>
                                    </label>

                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name="visibility"
                                            value="unlisted"
                                            checked={videoDetails.visibility === 'unlisted'}
                                            onChange={handleInputChange}
                                            disabled={isUploading}
                                        />
                                        <div className="radio-content">
                                            <span className="radio-title">Unlisted</span>
                                            <span className="radio-description">Anyone with the link can view</span>
                                        </div>
                                    </label>

                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name="visibility"
                                            value="public"
                                            checked={videoDetails.visibility === 'public'}
                                            onChange={handleInputChange}
                                            disabled={isUploading}
                                        />
                                        <div className="radio-content">
                                            <span className="radio-title">Public</span>
                                            <span className="radio-description">Everyone can see this video</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={handleCancel}
                                    disabled={isUploading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-upload"
                                    disabled={isUploading || !videoDetails.title.trim()}
                                >
                                    {isUploading ? `Uploading ${uploadProgress}%...` : 'Upload Video'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}