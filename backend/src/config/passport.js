import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { query } from '../database/config/database.js';
import { generateHandle } from '../utils/helpers.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const downloadPfp = (url, filename) => {
    return new Promise((resolve, reject) => {
        const uploadPath = path.join(__dirname, '../uploads/pfp');
        fs.mkdirSync(uploadPath, { recursive: true });

        const filePath = path.join(uploadPath, filename);
        const file     = fs.createWriteStream(filePath);

        const protocol = url.startsWith('https') ? https : http;

        protocol.get(url, (response) => {
            // follow redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                return downloadPfp(response.headers.location, filename)
                    .then(resolve)
                    .catch(reject);
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(`/uploads/pfp/${filename}`);
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => {}); // cleanup failed file
            reject(err);
        });
    });
};

const generateOAuthPassword = () => {
    return 'oauth'+crypto.randomBytes(32).toString('hex');
};

// Google 
passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  '/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const name  = profile.displayName;
        const googlePfpUrl = profile.photos[0]?.value || null;

        // check if user exists
        const existing = await query(
            'SELECT * FROM users WHERE email = $1', [email]
        );

        if (existing.rows[0]) {
            return done(null, existing.rows[0]);
        }

        // ✅ download pfp from Google and save locally
        let localPfpPath = '/uploads/pfp/default-avatar.png';
        if (googlePfpUrl) {
            try {
                const filename = `google-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
                // ✅ get higher resolution — remove size param
                const highResPfpUrl = googlePfpUrl.replace('=s96-c', '=s400-c');
                localPfpPath = await downloadPfp(highResPfpUrl, filename);
            } catch (err) {
                console.warn('Failed to download Google pfp:', err.message);
                // fallback to default
            }
        }

        const handle = await generateHandle(name);

        const newUser = await query(
            `INSERT INTO users (user_id, name, email, password, pfp)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, user_id, name, email, pfp`,
            [handle, name, email, generateOAuthPassword(), localPfpPath]
        );

        return done(null, newUser.rows[0]);
    } catch (err) {
        return done(err, null);
    }
}));

// Twitter
passport.use(new TwitterStrategy({
    consumerKey:    process.env.TWITTER_CLIENT_ID,
    consumerSecret: process.env.TWITTER_CLIENT_SECRET,
    callbackURL:    '/api/auth/twitter/callback',
    includeEmail:   true
}, async (token, tokenSecret, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value || `${profile.username}@twitter.com`;
        const name  = profile.displayName;

        // ✅ get full size twitter pfp (remove _normal)
        const twitterPfpUrl = profile.photos?.[0]?.value
            ?.replace('_normal', '') || null;

        const existing = await query(
            'SELECT * FROM users WHERE email = $1', [email]
        );

        if (existing.rows[0]) {
            return done(null, existing.rows[0]);
        }

        // ✅ download twitter pfp locally
        let localPfpPath = '/uploads/pfp/default-avatar.png';
        if (twitterPfpUrl) {
            try {
                const filename = `twitter-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
                localPfpPath = await downloadPfp(twitterPfpUrl, filename);
            } catch (err) {
                console.warn('Failed to download Twitter pfp:', err.message);
            }
        }

        const handle = await generateHandle(profile.username || name);
        const newUser = await query(
            `INSERT INTO users (user_id, name, email, password, pfp)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, user_id, name, email, pfp`,
            [handle, name, email, generateOAuthPassword(), localPfpPath]
        );

        return done(null, newUser.rows[0]);
    } catch (err) {
        return done(err, null);
    }
}));

export default passport;