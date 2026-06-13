import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { initCronJobs } from './jobs/index.js';
import passport from './config/passport.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// import database
import pool from './database/config/database.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import channelRoutes from './routes/channelRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import userRoutes from './routes/userRoutes.js';

// Import error handlers
import { errorHandler, notFound } from './middleware/errorHandler.js';


// Create Express app
const app = express();
const PORT = process.env.PORT || 5001;


// CORS to allow request from frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(passport.initialize());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}



app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'YouTube Clone API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      videos: '/api/videos',
      channels: '/api/channels',
      uploads:'/api/uploads'
    }
  });
});

// API Routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', authRoutes);       // Authentication routes
app.use('/api/videos', videoRoutes);    // Video routes
app.use('/api/channels', channelRoutes); //channel routes
app.use('/api/videos/:videoId/comments',commentRoutes);
app.use('/api/comments/',commentRoutes)
app.use('/api/user',userRoutes);



app.use(notFound);


app.use(errorHandler);

const startServer = async () => {
  try {
    await pool.query('SELECT NOW()');

    console.log('✓ Database connected successfully');

    // Start Express server
    app.listen(PORT, () => {
      console.log('================================');
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ API: http://localhost:${PORT}/api`);
      console.log('================================');
      initCronJobs();
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;