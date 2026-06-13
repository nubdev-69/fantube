const API_BASE_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:5001';

export const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5001';

export const API_ENDPOINTS = {
    UPLOAD_VIDEO: `${API_BASE_URL}/api/videos/upload`,
    GET_VIDEO: (videoId) => `${API_BASE_URL}/api/videos/${videoId}`,
    GET_CHANNEL_VIDEOS: (channelId) => `${API_BASE_URL}/api/videos/channel/${channelId}`,
};

export default API_BASE_URL;