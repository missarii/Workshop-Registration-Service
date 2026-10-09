'use strict';

const { pool } = require('../config/db');

/**
 * Register an attendee — uses SELECT FOR UPDATE to prevent overbooking.
 */
async function registerAttendee(workshopId, attendeeData, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the workshop row to serialize concurrent registrations
    const workshopResult = await client.query(
      `SELECT id, capacity, status FROM workshops WHERE id = $1 FOR UPDATE`,
      [workshopId]
    );

    if (workshopResult.rowCount === 0) {
      const err = new Error('Workshop not found.');
      err.status = 404;
      throw err;
    }

    const workshop = workshopResult.rows[0];

    if (workshop.status !== 'scheduled') {
      const err = new Error(
        `Cannot register for a workshop with status "${workshop.status}".`
      );
      err.status = 409;
      throw err;
    }

    // Count active registrations within the same transaction
    const countResult = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM registrations
       WHERE workshop_id = $1 AND status = 'active'`,
      [workshopId]
    );

    if (countResult.rows[0].total >= workshop.capacity) {
      const err = new Error('Workshop is full. No seats available.');
      err.status = 409;
      throw err;
    }

    // Insert the registration
    const result = await client.query(
      `INSERT INTO registrations
         (workshop_id, attendee_name, attendee_email, status, registered_by, registered_at, notes)
       VALUES ($1, $2, $3, 'active', $4, NOW(), $5)
       RETURNING *`,
      [workshopId, attendeeData.attendee_name, attendeeData.attendee_email, userId,
       attendeeData.notes || null]
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
       VALUES ($1, 'REGISTER_ATTENDEE', 'registration', $2, $3)`,
      [userId, result.rows[0].id, JSON.stringify({
        workshop_id: workshopId,
        attendee_email: attendeeData.attendee_email,
      })]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Cancel a registration — uses a row lock to prevent double-cancellation freeing extra seats.
 */
async function cancelRegistration(registrationId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const regResult = await client.query(
      `SELECT id, status, workshop_id FROM registrations WHERE id = $1 FOR UPDATE`,
      [registrationId]
    );

    if (regResult.rowCount === 0) {
      const err = new Error('Registration not found.');
      err.status = 404;
      throw err;
    }

    const reg = regResult.rows[0];

    if (reg.status === 'cancelled') {
      // Idempotent — already cancelled, return current record unchanged
      await client.query('ROLLBACK');
      const current = await pool.query(
        `SELECT * FROM registrations WHERE id = $1`, [registrationId]
      );
      return { registration: current.rows[0], alreadyCancelled: true };
    }

    const result = await client.query(
      `UPDATE registrations
       SET status = 'cancelled', cancelled_by = $1, cancelled_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [userId, registrationId]
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
       VALUES ($1, 'CANCEL_REGISTRATION', 'registration', $2, $3)`,
      [userId, registrationId, JSON.stringify({ workshop_id: reg.workshop_id })]
    );

    await client.query('COMMIT');
    return { registration: result.rows[0], alreadyCancelled: false };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listByWorkshop(workshopId, status) {
  const conditions = ['r.workshop_id = $1'];
  const values = [workshopId];

  if (status) {
    conditions.push(`r.status = $2`);
    values.push(status);
  }

  const result = await pool.query(
    `SELECT
       r.id, r.workshop_id, r.attendee_name, r.attendee_email,
       r.status, r.notes,
       r.registered_at, r.cancelled_at,
       u1.name AS registered_by_name,
       u2.name AS cancelled_by_name
     FROM registrations r
     LEFT JOIN users u1 ON u1.id = r.registered_by
     LEFT JOIN users u2 ON u2.id = r.cancelled_by
     WHERE ${conditions.join(' AND ')}
     ORDER BY r.registered_at DESC`,
    values
  );
  return result.rows;
}

async function listAll(filters = {}) {
  const conditions = [];
  const values = [];
  let i = 1;

  if (filters.status) {
    conditions.push(`r.status = $${i++}`);
    values.push(filters.status);
  }
  if (filters.workshop_id) {
    conditions.push(`r.workshop_id = $${i++}`);
    values.push(filters.workshop_id);
  }

  const whereClause = conditions.length > 0
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

  const result = await pool.query(
    `SELECT
       r.id, r.workshop_id, r.attendee_name, r.attendee_email,
       r.status, r.notes,
       r.registered_at, r.cancelled_at,
       w.code AS workshop_code,
       w.title AS workshop_title,
       u1.name AS registered_by_name,
       u2.name AS cancelled_by_name
     FROM registrations r
     LEFT JOIN workshops w ON w.id = r.workshop_id
     LEFT JOIN users u1 ON u1.id = r.registered_by
     LEFT JOIN users u2 ON u2.id = r.cancelled_by
     ${whereClause}
     ORDER BY r.registered_at DESC`,
    values
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT r.*, w.code AS workshop_code, w.title AS workshop_title,
            u1.name AS registered_by_name, u2.name AS cancelled_by_name
     FROM registrations r
     LEFT JOIN workshops w ON w.id = r.workshop_id
     LEFT JOIN users u1 ON u1.id = r.registered_by
     LEFT JOIN users u2 ON u2.id = r.cancelled_by
     WHERE r.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function getHistory(registrationId) {
  // Return audit log events for this registration
  const result = await pool.query(
    `SELECT al.id, al.action, al.details, al.created_at, u.name AS actor_name
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_id
     WHERE al.entity_type = 'registration' AND al.entity_id = $1
     ORDER BY al.created_at ASC`,
    [registrationId]
  );
  return result.rows;
}

module.exports = {
  registerAttendee,
  cancelRegistration,
  listByWorkshop,
  listAll,
  findById,
  getHistory,
};
