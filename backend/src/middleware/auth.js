// src/middleware/auth.js
// This file checks if user is authenticated (logged in)

import jwt from 'jsonwebtoken';

// Middleware to authenticate user
export const authenticate = (req, res, next) => {
  try {
    // 1. Get token from header
    // Header format: "Authorization: Bearer <token>"
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.split(' ')[1]; // Get token after "Bearer "

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Add user ID to request object
    req.userId = decoded.userId;

    // 4. Continue to next middleware/controller
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.userId = null; // not logged in — continue anyway
      return next();
    }
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
    }

    next();
  } catch (error) {
    // Ignore errors, just don't set userId
    next();
  }
};