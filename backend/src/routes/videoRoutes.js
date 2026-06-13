// src/routes/videoRoutes.js
// This file defines all video-related routes

import express from 'express';
import VideoController from '../controllers/videoController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validateCreateVideo } from '../middleware/validation.js';
import {uploadThumbnail, uploadVideo,uploadVideoWithThumbnail} from '../middleware/upload.js';
import ChannelController from '../controllers/channelController.js';
import VideoModel from '../models/Video.js';
// import { valid } from 'joi';


const router = express.Router({ mergeParams: true });

// GET /api/videos - Get all videos (public)
router.get('/', optionalAuth, VideoController.getAllVideos);

router.get('/explore',optionalAuth, VideoController.explore);

// GET /api/videos/search - Search videos (public)
// router.get('/search', VideoController.searchVideos);

router.get('/search', VideoModel.Search); 

router.get('/:videoId/suggested', optionalAuth, VideoModel.getSuggested);

// GET /api/videos/:id - Get video by ID (public)
router.get('/:id', optionalAuth, VideoController.getVideoById);

// Get video by ID (private) for
router.get('/edit/:id', authenticate, VideoController.getVideoInfo);

// GET /api/videos/serach?=title - Get video by title (public)

router.get('/:title',optionalAuth,VideoController.getVideoByTitle);

router.post('/upload',authenticate,validateCreateVideo,uploadVideoWithThumbnail.fields([
    {name:'video',maxCount:1},
    { name: 'thumbnail', maxCount: 1 }
]),VideoController.createVideo);

router.post('/update/:videoId',authenticate,validateCreateVideo,uploadThumbnail.single('thumbnail'),VideoController.updateVideo);

// DELETE /api/videos/:id - Delete video (protected)
router.delete('/:videoId', authenticate, VideoController.deleteVideo);

router.post('/:videoId/watch',optionalAuth,VideoController.recordWatch);

router.post('/:videoId/interaction',authenticate,VideoController.recordInteraction);

router.get('/:videoId/interaction/status',authenticate,VideoController.interactionStatus);

export default router;