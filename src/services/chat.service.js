import pool from "../db/index.js";

class ChatService {

  // Create new session
  static async createSession(userId) {
    const result = await pool.query(
      `INSERT INTO chat_sessions (user_id, status)
       VALUES ($1, 'active')
       RETURNING *`,
      [userId]
    );

    return result.rows[0];
  }

  static async getUserSessions(userId) {
    const result = await pool.query(
      `SELECT id, status, created_at
      FROM chat_sessions
      WHERE user_id = $1
      ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  // Get session by ID (ensure ownership)
  static async getSession(sessionId, userId) {
    const result = await pool.query(
      `SELECT * FROM chat_sessions
       WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error("Chat session not found");
    }

    return result.rows[0];
  }

  // Save message
  static async saveMessage(sessionId, sender, message) {
    const result = await pool.query(
      `INSERT INTO chat_messages (session_id, sender, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [sessionId, sender, message]
    );

    return result.rows[0];
  }

  // Get conversation history
  static async getMessages(sessionId) {
    const result = await pool.query(
      `SELECT id, sender, message, created_at
       FROM chat_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );

    return result.rows;
  }

  // // Close session (optional)
  // static async completeSession(sessionId) {
  //   await pool.query(
  //     `UPDATE chat_sessions
  //      SET status = 'completed',
  //          updated_at = CURRENT_TIMESTAMP
  //      WHERE id = $1`,
  //     [sessionId]
  //   );
  // }
}

export default ChatService;