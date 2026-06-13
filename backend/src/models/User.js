// src/models/User.js
// This file handles all database operations for users

import { query } from '../database/config/database.js';

class UserModel {
  // Create a new user
  static async create({ userId, name, email, password, pfp }) {
    const result = await query(
      `INSERT INTO users (user_id, name, email, password, pfp) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, user_id, name, email, pfp, created_at`,
      [userId, name, email, password, pfp]
    );
    return result.rows[0];
  }

  // Find user by email
  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  // Find user by ID
  static async findById(id) {
    const result = await query(
      'SELECT id, user_id, name, email, pfp, created_at FROM users WHERE user_id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async findByIntId(id) {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  // Update user
  static async update(id, { name,userId, pfp }) {
    const result = await query(
      `UPDATE users 
       SET name = COALESCE($1, name),
            user_id = COALESCE($2, user_id),
           pfp = COALESCE($3, pfp),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id,user_id, name, email, pfp,created_at`,
      [name,userId, pfp, id]
    );
    return result.rows[0];
  }

  static async getId(userId) {
    const result = await query(
      `select id from users where user_id=$1`, [userId]
    );
    return result.rows[0].id;
  }

  static async changePassword(id,password){
    await query(
      `UPDATE users SET password=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2`,
      [password,id]
  );
  }

  // Delete user
  static async delete(id) {
    await query('DELETE FROM users WHERE id = $1', [id]);
    return { deleted: true };
  }


}


export default UserModel;