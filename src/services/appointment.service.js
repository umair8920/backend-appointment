import pool from "../db/index.js";

const SLOT_INTERVAL_MINUTES = 30;
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 17;
const MODIFICATION_WINDOW_HOURS = 2;

class AppointmentService {

  static normalizeSlot(dateObj) {
    const d = new Date(dateObj);
    d.setUTCSeconds(0, 0);
    return d;
  }

  static isValidSlot(dateObj) {
    const h = dateObj.getUTCHours();
    const m = dateObj.getUTCMinutes();

    if (h < WORK_START_HOUR || h >= WORK_END_HOUR) return false;
    if (m % SLOT_INTERVAL_MINUTES !== 0) return false;

    return true;
  }

  static isSameDay(dateObj) {
    const today = new Date();
    return dateObj.toDateString() === today.toDateString();
  }

  // ----------------------------------------
  // CHECK AVAILABILITY
  // ----------------------------------------
  static async checkAvailability(slot) {

    if (!slot) {
      const next = await this.findNextAvailableSlot(new Date());

      return {
        type: "next_available",
        suggested_slot: next.suggested_slot
      };
    }

    const dateObj = this.normalizeSlot(new Date(slot));

    if (dateObj < new Date())
      throw new Error("Cannot book past time");

    if (this.isSameDay(dateObj))
      throw new Error("Same-day booking not allowed");

    if (!this.isValidSlot(dateObj))
      throw new Error("Invalid time slot");

    const existing = await pool.query(
      `SELECT id FROM appointments
       WHERE appointment_date = $1
       AND status != 'cancelled'`,
      [dateObj]
    );

    if (existing.rows.length === 0) {
      return {
        type: "requested",
        available: true,
        requested_slot: dateObj.toISOString()
      };
    }

    return await this.findNextAvailableSlot(dateObj);
  }

  static async findNextAvailableSlot() {

    const now = new Date();

    // Start from tomorrow 09:00 UTC
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() + 1);
    start.setUTCHours(9, 0, 0, 0);

    const MAX_DAYS = 30;

    for (let day = 0; day < MAX_DAYS; day++) {

      for (let hour = 9; hour < 17; hour++) {

        for (let minute of [0, 30]) {

          const slot = new Date(start);
          slot.setUTCDate(start.getUTCDate() + day);
          slot.setUTCHours(hour, minute, 0, 0);

          const existing = await pool.query(
            `SELECT id FROM appointments
            WHERE appointment_date = $1
            AND status != 'cancelled'`,
            [slot]
          );

          if (existing.rows.length === 0) {
            return {
              suggested_slot: slot.toISOString()
            };
          }
        }
      }
    }

    throw new Error("No available slots found within 30 days");
  }

  // ----------------------------------------
  // BOOK
  // ----------------------------------------
  static async bookAppointment(userId, slot, viaChat = false) {

    const dateObj = this.normalizeSlot(new Date(slot));

    const result = await pool.query(
      `INSERT INTO appointments
       (user_id, appointment_date, booked_via_chat, status)
       VALUES ($1,$2,$3,'confirmed')
       RETURNING *`,
      [userId, dateObj, viaChat]
    );

    return result.rows[0];
  }

  // ----------------------------------------
  // CANCEL
  // ----------------------------------------
  static async cancelAppointment(userId, appointmentId) {

    const result = await pool.query(
      `SELECT * FROM appointments
       WHERE id=$1`,
      [appointmentId]
    );

    if (!result.rows.length)
      throw new Error("Appointment not found");

    const appointment = result.rows[0];

    if (appointment.user_id !== userId)
      throw new Error("Unauthorized");

    const createdAt = new Date(appointment.created_at);
    const diffHours = (new Date() - createdAt) / 3600000;

    if (diffHours > MODIFICATION_WINDOW_HOURS)
      throw new Error("Cancellation window expired");

    const updated = await pool.query(
      `UPDATE appointments
       SET status='cancelled',
           updated_at=CURRENT_TIMESTAMP
       WHERE id=$1
       RETURNING *`,
      [appointmentId]
    );

    return updated.rows[0];
  }

  static async getUserAppointments(userId) {
    const result = await pool.query(
      `SELECT * FROM appointments
       WHERE user_id=$1
       ORDER BY appointment_date ASC`,
      [userId]
    );
    return result.rows;
  }
}

export default AppointmentService;