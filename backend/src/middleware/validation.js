// src/middleware/validation.js
// This file validates request data before it reaches controllers

import Joi from 'joi';

// Validate user registration
export const validateRegister = (req, res, next) => {
  const schema = Joi.object({
    userId:Joi.string().min(3).max(20).required(),
    name: Joi.string().min(3).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  
  next();
};

// Validate user login
export const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  
  next();
};

// Validate video creation
export const validateCreateVideo = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().min(1).max(255).required(),
    description: Joi.string().allow(''),
    thumbnail: Joi.string().uri().allow(''),
    videoUrl: Joi.string().uri().required(),
    channelId: Joi.number().integer().required(),
    visibility: Joi.string().valid('public', 'private', 'unlisted')
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  
  next();
};

// Validate channel creation
export const validateCreateChannel = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().allow(''),
    banner: Joi.string().uri().allow('')
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  
  next();
};