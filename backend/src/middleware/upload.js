import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { query } from '../database/config/database.js';

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomBytes = crypto.randomBytes(11);

    let id = '';
    for (let i = 0; i < 11; i++) {
        id += chars[randomBytes[i] % chars.length];
    }
    return id;
}

const generateUniqueFilename = async (uploadPath, ext, maxAttempts = 8) => {
    let attempts = 0;

    while (attempts < maxAttempts) {
        const id = generateId();
        const filename = id + ext;                               // → dQw4w9WgXcQ.mp4
        const fullPath = path.join(uploadPath, filename);        // → /uploads/videos/dQw4w9WgXcQ.mp4

        // Check 1 — does file exist on disk?
        const existsOnDisk = fs.existsSync(fullPath);

        // Check 2 — does filename exist in database?
        const result = await query(
            'SELECT id FROM videos WHERE video_id = $1',
            [id]
        );
        const existsInDb = result.rows.length > 0;

        // If unique in both places → use it ✅
        if (!existsOnDisk && !existsInDb) {
            return { id, filename };
        }
        attempts++;
        console.warn(`Duplicate found: ${filename} — retrying (attempt ${attempts})`);
    }

    // If all attempts fail (extremely unlikely), throw error
    throw new Error('Could not generate unique filename after max attempts');
};



const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/videos');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: async (req, file, cb) => {
        if (req.videoId) {
            cb(null, `${req.videoId}.${path.extname(file.originalname)}`)
        }
        try {
            const uploadPath = path.join(__dirname, '../uploads/videos');
            const ext = path.extname(file.originalname);
            const fileName = await generateUniqueFilename(uploadPath, ext)

            cb(null, fileName);
        } catch (err) {
            cb(err);
        }
    }
});
// thumbnail storage will be called only when video is updated
// when a new thumbnail is added to it
const thumbnailStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/thumbnails');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: async (req, file, cb) => {
        try {
            const { videoId } = req.params;
            const vid = await query(`select * from videos where video_id=$1`, [videoId]);

            if (vid.rows.length === 0) {
                return cb(new Error('Video not found'));
            }
            const currentThumbnail = vid.rows[0].thumbnail;

            const ext = path.extname(file.originalname)
            const filename = videoId + ext;
            const uploadPath = path.join(__dirname, '../uploads/thumbnails');

            if (currentThumbnail) {
                const oldFilename = path.basename(currentThumbnail); // abc.jpg
                const oldFilePath = path.join(uploadPath, oldFilename);

                if (oldFilename !== filename && fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                    console.log('Deleted old thumbnail:', oldFilename);
                }
            }

            req.thumbnail_url = `/uploads/thumbnails/${filename}`;
            cb(null, filename);

        } catch (err) {
            cb(err);
        }
    }
});

const combinedStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath;

        if (file.fieldname === 'video') {
            uploadPath = path.join(__dirname, '../uploads/videos');        // ← video goes here
        } else if (file.fieldname === 'thumbnail') {
            uploadPath = path.join(__dirname, '../uploads/thumbnails')    // ← thumbnail goes here
        }

        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: async (req, file, cb) => {
        try {
            let uploadPath;
            if (file.fieldname === 'video') {
                uploadPath = path.join(__dirname, '../uploads/videos');
                const ext = path.extname(file.originalname);
            }
            else if (file.fieldname === 'thumbnail') {
                uploadPath = path.join(__dirname, '../uploads/thumbnails');
            }

            const ext = path.extname(file.originalname);

            if (file.fieldname === 'video') {
                const { id, filename } = await generateUniqueFilename(uploadPath, ext);
                req.videoId = id;
                req.videoFilename = filename;
                req.video_url = `/uploads/videos/${filename}`;
                cb(null, filename);
            } else if (file.fieldname === 'thumbnail') {
                if (req.videoId) {
                    const filename = req.videoId + ext;
                    req.thumbnail_url = `/uploads/thumbnails/${filename}`;
                    cb(null, filename);
                }
                else {
                    const { id, filename } = await generateUniqueFilename(uploadPath, ext);
                    req.videoId = id;
                    req.thumbnailFilename = filename;
                    req.thumbnail_url = `/uploads/thumbnails/${filename}`;
                    cb(null, filename);
                }
            }
        } catch (err) {
            cb(err);
        }
    }
});

const postStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/posts');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const videoFilter = (req, file, cb) => {
    const allowedTypes = /mp4|mov|avi|mkv|webm/;
    const isValid = allowedTypes.test(path.extname(file.originalname).toLowerCase())
        && allowedTypes.test(file.mimetype);
    isValid ? cb(null, true) : cb(new Error('Only video files allowed!'));
};
const imageFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const isValid = allowedTypes.test(path.extname(file.originalname).toLowerCase()) && allowedTypes.test(file.mimetype);
    isValid ? cb(null, true) : cb(new Error('Only image files allowed!'));
};

const combinedFilter = (req, file, cb) => {
    if (file.fieldname === 'video') {
        const allowedTypes = /mp4|mov|avi|mkv|webm/;
        const isValid = allowedTypes.test(path.extname(file.originalname).toLowerCase()); // && allowedTypes.test(file.mimetype);
        isValid ? cb(null, true) : cb(new Error('Only video files allowed!'));

    } else if (file.fieldname === 'thumbnail') {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const isValid = allowedTypes.test(path.extname(file.originalname).toLowerCase())
            && allowedTypes.test(file.mimetype);
        isValid ? cb(null, true) : cb(new Error('Only image files allowed!'));

    } else {
        cb(new Error('Unexpected field'));
    }
};

const pfpStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/pfp');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const userId = req.body.userId || 'user';
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const filename = `${unique}${path.extname(file.originalname)}`;
        req.pfp_url = `/uploads/pfp/${filename}`;
        cb(null, filename);
    }
});

const bannerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/banners');

        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: async (req, file, cb) => {
        const userId = req.body.userId || 'user';
        const unique = Date.now() + '-' + Math.round(Math.round() * 1e9);
        const filename = `${unique}${path.extname(file.originalname)}`;
        req.banner_url = `/uploads/banners/${filename}`;
        cb(null, filename);
    }
});

export const uploadBanner = multer({
    storage: bannerStorage,
    fileFilter: imageFilter,
    imits: { fileSize: 500 * 1024 * 1024 }
});


export const uploadVideo = multer({
    storage: videoStorage,
    fileFilter: videoFilter,
    limits: { fileSize: 500 * 1024 * 1024 }  // 500MB
});

export const uploadThumbnail = multer({
    storage: thumbnailStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 }    // 5MB
});

export const uploadVideoWithThumbnail = multer({
    storage: combinedStorage,
    fileFilter: combinedFilter,
    limits: { fileSize: 500 * 1024 * 1024 }  // 500MB (covers largest file)
});

export const uploadPost = multer({
    storage: postStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

export const uploadPfp = multer({
    storage: pfpStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});