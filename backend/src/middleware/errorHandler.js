// src/middleware/errorHandler.js
// This file handles errors gracefully

// 404 Not Found handler
export const notFound = (req, res, next) => {
    res.status(404).json({
      error: 'Route not found',
      path: req.originalUrl
    });
  };
  
  // Global error handler
  export const errorHandler = (err, req, res, next) => {
    // Log error to console
    console.error('Error:', err);
  
    // Determine status code
    const statusCode = err.statusCode || 500;
  
    // Send error response
    res.status(statusCode).json({
      error: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  };