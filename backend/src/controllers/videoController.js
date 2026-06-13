// src/controllers/videoController.js
// This file handles video-related logic
import VideoModel from '../models/Video.js';
import ChannelModel from '../models/Channel.js';
import { Channel } from 'diagnostics_channel';
import path from 'path';
import fs from 'fs';

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


class VideoController {
    // Get all videos
    static async getAllVideos(req, res, next) {
        try {
            const { page, limit } = req.query;
            const videos = await VideoModel.findAll({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 15,
                userId: req.userId
            });
            res.json({
                videos,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20
            });
        } catch (error) {
            next(error);
        }
    }

    // Get video by ID
    static async getVideoById(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.userId;

            const video = await VideoModel.findById(id);

            if (!video) {
                return res.status(404).json({ error: 'Video not found' });
            }
            if (video.visibility === 'private' && video.channel.ownerId != userId) {
                return res.status(403).json({
                    error: "Permission Denied"
                })
            }

            res.json({ video });
        } catch (error) {
            next(error);
        }
    }
    static async getVideoInfo(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.userId;

            const video = await VideoModel.findById(id);

            if (!video) {
                return res.status(404).json({ error: 'Video not found' });
            }

            if (video.channel.id !== userId) {
                return res.status(403).json({ error: 'unauthorized' });
            }

            res.json({ video });

        } catch (err) {
            next(err);
        }
    }
    static async getVideoByTitle(req, res, next) {
        try {
            const { title, page, limit } = req.query;

            const videos = await VideoModel.findByTitle({
                title: title,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20
            });

            if (videos.length === 0) {
                return res.status(404).json({
                    error: 'No video found',
                    searchTerm: title
                });
            }
            res.json({
                videos: videos,
                count: videos.count,
                searchTerm: title,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20
            });
        } catch (error) {
            next(error);
        }
    }
    static async uploadVideo(req, res) {
        try {
            if (!req.file)
                return res.status(400).json({ error: "No video upload files" });

            const { title } = req.body;
            const fileUrl = `${req.protocol}://${req.get('host')}/uploads/videos/${req.file.filename}`;

            const insertedId = await Video.create({
                title: title || req.file.originalname,
                filename: req.file.filename,
                filepath: req.file.path,
                url: fileUrl,            // ← the public URL
                mimetype: req.file.mimetype,
                size: req.file.size
            });

            const savedVideo = await Video.findById(insertedId);

            res.status(201).json({
                message: 'Video uploaded successfully!',
                video: savedVideo            // includes the URL
            });

        } catch (err) {
            res.status(500).json({ error: err.message })
        }

    }

    // Create new video
    static async createVideo(req, res) {
        try {
            console.log('Upload request received');
            console.log('Files:', req.files);
            console.log('Body:', req.body);

            // Validate video file
            if (!req.files || !req.files['video']) {
                return res.status(400).json({
                    success: false,
                    message: 'Video file is required'
                });
            }

            // Validate title
            const { title, description, visibility, category, tags, duration } = req.body;

            if (!title || !title.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Title is required'
                });
            }

            // Get user info (from auth middleware)
            const userId = req.userId;
            const channel = await ChannelModel.findByUserId(userId);

            if (!channel) {
                return res.status(404).json({ error: 'Channel not found' });
            }
            const channelId = channel.id;

            // Parse tags
            const tagsArray = tags
                ? tags.split(',').map(tag => tag.trim()).filter(tag => tag)
                : [];

            // Get file paths (set by multer middleware)
            const videoId = req.videoId;
            const video_url = req.video_url;
            const thumbnail_url = req.thumbnail_url || null;

            // Create video in database
            const video = await VideoModel.create({
                videoId: videoId,
                title: title.trim(),
                description: description?.trim() || '',
                thumbnail_url: thumbnail_url,
                video_url: video_url,
                channelId: channelId,
                createdBy: userId,
                visibility: visibility || 'private',
                duration: parseInt(duration) || 0,
                tags: tagsArray,
                category: category || null
            });

            res.status(200).json({
                success: true,
                message: 'Video uploaded successfully',
                videoId: videoId,
                data: {
                    id: video.id,
                    videoId: video.video_id,
                    title: video.title,
                    thumbnail: video.thumbnail,
                    video_url: video.video_url,
                    visibility: video.visibility
                }
            });

        } catch (error) {
            console.error('Upload error:', error);

            // Clean up uploaded files on error
            try {
                const fs = await import('fs');
                if (req.files) {
                    if (req.files['video']) {
                        fs.unlinkSync(req.files['video'][0].path);
                    }
                    if (req.files['thumbnail']) {
                        fs.unlinkSync(req.files['thumbnail'][0].path);
                    }
                }
            } catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
            }

            res.status(500).json({
                success: false,
                message: 'Upload failed: ' + error.message
            });
        }
    }

    // Update video
    static async updateVideo(req, res, next) {
        try {
            const { videoId } = req.params;
            const { title, description, visibility, commentsEnabled, tags, category } = req.body;

            const channel = await ChannelModel.getChannelByUserId(req.userId);

            const video = await VideoModel.findById(videoId);
            if (!video) {
                return res.status(404).json({ error: 'Video not found' });
            }
            console.log(channel);

            if (video.channel.handle !== channel.user_id) {
                return res.status(403).json({ error: 'You do not own this video' });
            }
            const updateData = {
                title,
                description,
                visibility,
                commentsEnabled: commentsEnabled === 'true' || commentsEnabled === true,
                tags: tags ? JSON.parse(tags) : undefined,
                category
            };
            if (req.file) {
                updateData.thumbnail = req.thumbnail_url;
            }

            // Update video
            const updatedVideo = await VideoModel.update(videoId, updateData);



            res.json({
                message: 'Video updated successfully',
                video: updatedVideo
            });
        } catch (error) {
            next(error);
        }
    }

    // Delete video
    // static async deleteVideo(req, res, next) {
    //     try {
    //         const { id } = req.params;

    //         // Check if video exists and user owns it
    //         const video = await VideoModel.findById(id);
    //         if (!video) {
    //             return res.status(404).json({ error: 'Video not found' });
    //         }

    //         if (video.created_by !== req.userId) {
    //             return res.status(403).json({ error: 'You do not own this video' });
    //         }

    //         // Delete video
    //         await VideoModel.delete(id);

    //         res.json({ message: 'Video deleted successfully' });
    //     } catch (error) {
    //         next(error);
    //     }
    // }
    static async deleteVideo(req, res, next) {
        try {
            const { videoId } = req.params;
            const userId = req.userId;

            // check ownership
            const video = await VideoModel.findById(videoId);
            if (!video) return res.status(404).json({ error: 'Video not found' });
            if (video.channel.ownerId !== userId) {
                return res.status(403).json({ error: 'You do not own this video' });
            }

            const videoFilePath = path.join(__dirname, '..', video.url);
            const thumbFilePath =video.thumbnail.url? path.join(__dirname, '..', video.thumbnail?.url) : null;

            if (fs.existsSync(videoFilePath)) fs.unlinkSync(videoFilePath);
            if (fs.existsSync(thumbFilePath)) fs.unlinkSync(thumbFilePath);

            await VideoModel.delete(video.id);

            res.json({ message: 'Video deleted successfully' });
        } catch (error) {
            next(error);
        }
    }

    // static async explore(req, res, next) {
    //     try {
    //         const { category } = req.query;

    //         if (category) {
    //             // single category — return trending videos for that category
    //             const videos = await VideoModel.getTrending({ category, limit: 20 });
    //             return res.json({
    //                 sections: [{ category, videos }]
    //             });
    //         }

    //         // no category — fetch top 6 per category in parallel
    //         const sections = await Promise.all(
    //             ['Gaming', 'Education', 'Entertainment', 'Music', 'Sports', 'Technology', 'Vlogs']
    //                 .map(async cat => {
    //                     const videos = await VideoModel.getTrending({ category: cat.toLowerCase(), limit: 6 });
    //                     return { category: cat, videos };
    //                 })
    //         );

    //         // only return sections that have videos
    //         res.json({ sections: sections.filter(s => s.videos.length > 0) });
    //     } catch (error) {
    //         next(error);
    //     }
    // }

    static async explore(req, res, next) {
        try {
            const { category } = req.query;
            const userId = req.userId || null;
    
            if (category) {
                // Single category — trending + engagement mixed with jitter
                const videos = await VideoModel.getExploreCategory({
                    category,
                    userId,
                    limit: 30
                });
                return res.json({
                    sections: [{ category, videos }]
                });
            }
    
            // All tab — personalized trending mix, no sections
            const videos = await VideoModel.getExploreFeed({ userId, limit: 40 });
            res.json({ sections: [{ category: 'trending', videos }] });
    
        } catch (error) {
            next(error);
        }
    }

    // Search videos
    static async searchVideos(req, res, next) {
        try {
            const { q, page, limit } = req.query;

            if (!q) {
                return res.status(400).json({ error: 'Search query required' });
            }

            const videos = await VideoModel.search(q, {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20
            });

            res.json({
                videos,
                query: q,
                page: parseInt(page) || 1
            });
        } catch (error) {
            next(error);
        }
    }
    static async recordWatch(req, res, next) {
        try {
            const { videoId } = req.params;
            const { viewId, watchDuration, completed } = req.body;
            const userId = req.userId; // null if not logged in

            // get integer video id from video_id VARCHAR
            const video_id = await VideoModel.getId(videoId);
            if (!video_id) return res.status(404).json({ error: 'Video not found' });

            if (viewId) {
                await VideoModel.updateWatch(viewId, watchDuration, completed);
                return res.json({ message: 'Watch updated' });
            }
            const result = await VideoModel.recordWatch(userId, video_id, watchDuration, completed);

            return res.json({
                message: "Watch Recorded",
                id: userId ? result.id : null
            });
        } catch (error) {
            next(error);
        }
    }
    static async interactionStatus(req, res, next) {
        try {
            const { videoId } = req.params;
            const userId = req.userId;

            const video_id = await VideoModel.getId(videoId);
            if (!video_id) return res.status(404).json({ error: 'Video not found' });

            const result = await VideoModel.interactionStatus(userId, video_id);
            return res.json({
                id: result?.id || null,
                interaction: result?.interaction || null
            })
        } catch (error) {
            next(error)
        }
    }
    static async recordInteraction(req, res, next) {
        try {
            const { videoId } = req.params;
            const userId = req.userId;
            const { id, interaction } = req.body;

            const video_id = await VideoModel.getId(videoId);
            if (!video_id) return res.status(404).json({ error: 'Video not found' });

            if (id) {
                const result = await VideoModel.updateInteraction(id, interaction);
                return res.json({
                    id: result.id,
                    interaction: result.interaction
                })
            } else {
                const result = await VideoModel.recordInteraction(userId, video_id, interaction);
                return res.json({
                    id: result.id,
                    interaction: result.interaction
                });
            }
        } catch (error) {
            next(error)
        }
    }
}

export default VideoController;