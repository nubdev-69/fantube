// src/routes/authRoutes.js
// This file defines all authentication-related routes

import express from 'express';
import passport from '../config/passport.js'
import jwt from 'jsonwebtoken'
import AuthController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRegister, validateLogin } from '../middleware/validation.js';
import { uploadPfp } from '../middleware/upload.js';

const CLIENT_URL=process.env.CLIENT_URL || 'http://localhost:5173';
// import ChannelModel from '../models/Channel.js';
// import UserModel from '../models/User.js';

const router = express.Router();

router.post('/register', uploadPfp.single('pfp'),validateRegister, AuthController.register);

router.post('/login', validateLogin, AuthController.login);

router.get('/profile', authenticate, AuthController.getProfile);

router.get('/usertype', authenticate, AuthController.getUserType);


router.put('/profile', authenticate, uploadPfp.single('pfp'), AuthController.updateProfile);

router.put('/account/password',authenticate,AuthController.changePassword);

// routes for oauth

//Google
router.get('/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false
    })
);

router.get('/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: `${CLIENT_URL}/login?error=google_failed`
    }),
    (req, res) => {
        const token = generateJWT(req.user);
        const user  = formatUser(req.user);

        // ✅ redirect to frontend with token in URL
        res.redirect(
            `${CLIENT_URL}/oauth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`
        );
    }
);

// Twitter
router.get('/twitter',
    passport.authenticate('twitter', { session: false })
);

router.get('/twitter/callback',
    passport.authenticate('twitter', {
        session: false,
        failureRedirect: `${CLIENT_URL}/login?error=twitter_failed`
    }),
    (req, res) => {
        const token = generateJWT(req.user);
        const user  = formatUser(req.user);

        res.redirect(
            `${CLIENT_URL}/oauth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`
        );
    }
);

// ── helpers ──────────────────────────────────────────────────
const generateJWT = (user) => jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
);

const formatUser = (user) => ({
    id:     user.id,
    userId: user.user_id,
    name:   user.name,
    email:  user.email,
    pfp:    user.pfp
});

export default router;