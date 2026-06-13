import express from 'express';
import { authenticate } from '../middleware/auth.js';
import UserController from '../controllers/userController.js';
import UserModel from '../models/User.js';


const router = express.Router();

router.get('/history',       authenticate, UserController.getHistory);
router.delete('/history',    authenticate, UserController.clearHistory);
router.get('/playlists',     authenticate, UserController.getPlaylists);

router.get('/liked',         authenticate, UserController.getLikedVideos);

router.get('/subscriptions', authenticate, UserController.getSubscriptions);
router.get('/subscriptions/feed', authenticate, UserController.getSubscriptionFeed);

export default router;