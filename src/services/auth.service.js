import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db/index.js";

const SALT_ROUNDS = 12;

class AuthService {

  static async register(data) {
    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      preferred_timezone,
      notes
    } = data;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Check existing user
      const existingUser = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error("Email already registered");
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Insert user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash)
         VALUES ($1, $2)
         RETURNING id, email, created_at`,
        [email, hashedPassword]
      );

      const user = userResult.rows[0];

      // Insert profile
      const profileResult = await client.query(
        `INSERT INTO user_profiles
         (user_id, first_name, last_name, phone, preferred_timezone, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          user.id,
          first_name || null,
          last_name || null,
          phone || null,
          preferred_timezone || null,
          notes || null
        ]
      );

      await client.query("COMMIT");

      return {
        user,
        profile: profileResult.rows[0]
      };

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async login({ email, password }) {
    const result = await pool.query(
      `SELECT id, email, password_hash 
       FROM users 
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error("Invalid credentials");
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email
      }
    };
  }

  static async getProfile(userId) {
    const result = await pool.query(
      `SELECT u.id, u.email,
              p.first_name, p.last_name,
              p.phone, p.preferred_timezone, p.notes
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    return result.rows[0];
  }

  static async updateProfile(userId, data) {
    const {
      first_name,
      last_name,
      phone,
      preferred_timezone,
      notes
    } = data;

    const result = await pool.query(
      `UPDATE user_profiles
       SET first_name = $1,
           last_name = $2,
           phone = $3,
           preferred_timezone = $4,
           notes = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $6
       RETURNING *`,
      [
        first_name,
        last_name,
        phone,
        preferred_timezone,
        notes,
        userId
      ]
    );

    return result.rows[0];
  }
}

export default AuthService;