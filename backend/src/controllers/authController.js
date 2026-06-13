// src/controllers/authController.js
// This file handles authentication logic (register, login, profile)

import UserModel from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

class AuthController {
  // Register new user
  static async register(req, res, next) {
    try {
      const { userId, name, email, password } = req.body;
      const pfpPath = req.pfp_url || '/uploads/pfp/default-avatar.png';

      // 1. Check if user already exists
      let existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      existingUser = await UserModel.findById(userId);
      if (existingUser) {
        return res.status(410).json({ error: 'userId already registered' });
      }

      // 2. Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 3. Create user
      const user = await UserModel.create({
        userId: userId,
        name,
        email,
        password: hashedPassword,
        pfp: pfpPath
      });

      // 4. Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // 5. Send response
      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          userId: user.user_id,
          name: user.name,
          email: user.email,
          pfp: user.pfp,
          createdAt: user.created_at
        },
        token
      });
    } catch (error) {
      next(error);
    }
  }

  // Login user
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // 1. Find user by email
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // 2. Compare password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // 3. Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // 4. Send response
      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          userId: user.user_id,
          name: user.name,
          email: user.email,
          pfp: user.pfp,
          createdAt: user.created_at
        },
        token
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user profile
  static async getProfile(req, res, next) {
    try {
      // req.userId comes from authenticate middleware
      const user = await UserModel.findById(req.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        user: {
          id: user.id,
          userId: user.user_id,
          name: user.name,
          email: user.email,
          pfp: user.pfp,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update user profile
  static async updateProfile(req, res, next) {
    try {
      const { name, userId } = req.body;
      const newPfpPath = req.pfp_url || null;

      // ✅ if new pfp uploaded, delete the old one
      if (newPfpPath) {
        const currentUser = await UserModel.findByIntId(req.userId);

        if (currentUser?.pfp) {
          const isDefault = currentUser.pfp.includes('default-avatar');
          if (!isDefault) {
            // build absolute path to old file
            const oldFilePath = path.join(__dirname, '..', currentUser.pfp);
            fs.unlink(oldFilePath, (err) => {
              if (err) console.warn('Could not delete old pfp:', err.message);
              else console.log('Old pfp deleted:', oldFilePath);
            });
          }
        }
      }

      if (userId) {
        const existing = await UserModel.findById(userId);
        if (existing && existing.id !== req.userId) {
          return res.status(409).json({ error: 'This handle is already taken' });
        }
      }

      const updated = await UserModel.update(req.userId, {
        name,
        userId,
        ...(newPfpPath && { pfp: newPfpPath })
      });

      res.json({
        message: 'Profile updated',
        user: {
          id: updated.id,
          userId: updated.user_id,
          name: updated.name,
          email: updated.email,
          pfp: updated.pfp,
          createdAt: updated.created_at
        }
      });
    } catch (error) {
      if (error.code === '23505' && error.constraint === 'users_user_id_key') {
        return res.status(409).json({ error: 'This handle is already taken' });
      }
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await UserModel.findByIntId(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) return res.status(401).json({ error: 'Current password is incorrect' });

      const hashed = await bcrypt.hash(newPassword, 10);

      await UserModel.changePassword(req.userId,hashed);
      res.json({message:'password changed successfully'});

    } catch (error) {
      next(error);
    }
  }

  static async getUserType(req, res, next) {
    try {
        const user = await UserModel.findByIntId(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            isOAuth: user.password.startsWith('oauth')
        });
    } catch (error) {
        next(error);
    }
}
}

export default AuthController;