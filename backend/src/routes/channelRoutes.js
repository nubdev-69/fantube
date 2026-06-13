// src/routes/channelRoutes.js
// This file defines all channel-related routes

import express from 'express';
import ChannelController from '../controllers/channelController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validateCreateChannel } from '../middleware/validation.js';
import { uploadBanner } from '../middleware/upload.js';
import UserController from '../controllers/userController.js';
import ChannelModel from '../models/Channel.js';

const router = express.Router();

// GET /api/channels/my - Get my channel (protected)
router.get('/my', authenticate, ChannelController.getMyChannel);

//get videos for featured videos to set in channel
router.get('/my/videos',authenticate,ChannelController.getFeaturedVideos)

// GET /api/channels/:id - Get channel by ID (public)
router.get('/:id',optionalAuth, ChannelController.getChannelById);

router.get('/:id/search', optionalAuth, ChannelModel.searchChannel);

// POST /api/channels - Create channel (protected)
router.post('/', authenticate, validateCreateChannel,uploadBanner.single('banner'), ChannelController.createChannel);

// PUT /api/channels/:id - Update channel (protected)
router.put('/:id', authenticate, uploadBanner.single('banner'),ChannelController.updateChannel);

// GET /api/channels/:id/videos - Get channel's videos (public)
router.get('/:id/videos',optionalAuth, ChannelController.getChannelVideos);

//get featured video and playlist for home tab
router.get('/:channelId/home',optionalAuth,ChannelController.getChannelHome);

// routes
router.get('/studio/stats',  authenticate, ChannelModel.getStudioStats);
// reuse existing myVideos route or add:
router.get('/studio/videos', authenticate, ChannelModel.getMyChannelVideos);

// POST /api/channels/:id/subscribe - Subscribe to channel (protected)

// DELETE /api/channels/:id/subscribe - Unsubscribe from channel (protected)
// router.delete('/:id/subscribe', authenticate, ChannelController.unsubscribe);

// GET /api/channels/:id/subscribers - Get channel subscribers (public)
router.get('/:id/subscribers', ChannelController.getSubscribers);

router.get('/:channelId/subscribe/status',optionalAuth,ChannelController.subscribeStatus);

router.post('/:channelId/subscribe',authenticate,ChannelController.subscribe1);


export default router;