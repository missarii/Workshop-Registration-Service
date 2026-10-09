'use strict';

const { pool } = require('../config/db');

/**
 * Build a filtered workshop query with active registration count.
 */
function buildListQuery(filters = {}) {
  const conditions = [];
  const values = [];
  let i = 1;

  if (filters.status) {
    conditions.push(`w.status = $${i++}`);
    values.push(filters.status);
  }
  if (filters.from) {
    conditions.push(`w.starts_at >= $${i++}`);
    values.push(filters.from);
  }
  if (filters.to) {
    conditions.push(`w.starts_at <= $${i++}`);
    values.push(filters.to);
  }
  if (filters.search) {
    conditions.push(`(w.title ILIKE $${i} OR w.code ILIKE $${i})`);
    values.push(`%${filters.search}%`);
    i++;
  }

  const whereClause = conditions.length > 0
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

  // availableOnly filter applied in HAVING
  const havingClause = filters.availableOnly
    ? `HAVING COUNT(r.id) FILTER (WHERE r.status = 'active') < w.capacity`
    : '';

  const sql = `
    SELECT
      w.id,
      w.code,
      w.title,
      w.description,
      w.instructor,
      w.location,
      w.starts_at,
      w.ends_at,
      w.capacity,
      w.status,
      w.created_by,
      w.created_at,
      w.updated_at,
      COUNT(r.id) FILTER (WHERE r.status = 'active')::int AS registered_count,
      (w.capacity - COUNT(r.id) FILTER (WHERE r.status = 'active')::int) AS available_seats
    FROM workshops w
    LEFT JOIN registrations r ON r.workshop_id = w.id
    ${whereClause}
    GROUP BY w.id
    ${havingClause}
    ORDER BY w.starts_at ASC
  `;

  return { sql, values };
}

async function list(filters = {}) {
  const { sql, values } = buildListQuery(filters);
  const result = await pool.query(sql, values);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT
       w.id, w.code, w.title, w.description, w.instructor, w.location,
       w.starts_at, w.ends_at, w.capacity, w.status,
       w.created_by, w.created_at, w.updated_at,
       COUNT(r.id) FILTER (WHERE r.status = 'active')::int AS registered_count,
       (w.capacity - COUNT(r.id) FILTER (WHERE r.status = 'active')::int) AS available_seats
     FROM workshops w
     LEFT JOIN registrations r ON r.workshop_id = w.id
     WHERE w.id = $1
     GROUP BY w.id`,
    [id]
  );
  return result.rows[0] || null;
}

async function create(data, userId) {
  const result = await pool.query(
    `INSERT INTO workshops
       (code, title, description, instructor, location, starts_at, ends_at, capacity, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [data.code, data.title, data.description || null, data.instructor,
     data.location, data.starts_at, data.ends_at, data.capacity, data.status, userId]
  );
  return result.rows[0];
}

/**
 * Update workshop with capacity guard — uses a transaction to prevent
 * capacity being set below active registration count.
 */
async function update(id, fields, activeCountCheck = true) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the row
    const current = await client.query(
      `SELECT id, capacity FROM workshops WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (current.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    if (activeCountCheck && fields.capacity !== undefined) {
      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total FROM registrations WHERE workshop_id = $1 AND status = 'active'`,
        [id]
      );
      if (fields.capacity < countRes.rows[0].total) {
        await client.query('ROLLBACK');
        const err = new Error(
          `Cannot reduce capacity below current active registrations (${countRes.rows[0].total}).`
        );
        err.status = 409;
        throw err;
      }
    }

    const sets = [];
    const values = [];
    let i = 1;

    if (fields.title !== undefined) { sets.push(`title = $${i++}`); values.push(fields.title); }
    if (fields.description !== undefined) { sets.push(`description = $${i++}`); values.push(fields.description); }
    if (fields.instructor !== undefined) { sets.push(`instructor = $${i++}`); values.push(fields.instructor); }
    if (fields.location !== undefined) { sets.push(`location = $${i++}`); values.push(fields.location); }
    if (fields.starts_at !== undefined) { sets.push(`starts_at = $${i++}`); values.push(fields.starts_at); }
    if (fields.ends_at !== undefined) { sets.push(`ends_at = $${i++}`); values.push(fields.ends_at); }
    if (fields.capacity !== undefined) { sets.push(`capacity = $${i++}`); values.push(fields.capacity); }
    if (fields.status !== undefined) { sets.push(`status = $${i++}`); values.push(fields.status); }

    sets.push(`updated_at = NOW()`);

    if (sets.length === 1) {
      await client.query('ROLLBACK');
      throw new Error('No fields to update.');
    }

    values.push(id);
    const result = await client.query(
      `UPDATE workshops SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      values
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

async function getDashboardStats() {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM workshops WHERE status = 'scheduled' AND starts_at > NOW()) AS upcoming_count,
      (SELECT COUNT(*)::int FROM registrations WHERE status = 'active') AS total_active_registrations,
      (SELECT COUNT(*)::int FROM workshops w
        WHERE w.status = 'scheduled'
          AND (SELECT COUNT(*)::int FROM registrations r WHERE r.workshop_id = w.id AND r.status = 'active') >= w.capacity
      ) AS full_workshops_count,
      (SELECT COUNT(*)::int FROM workshops w
        WHERE w.status = 'scheduled'
          AND (SELECT COUNT(*)::int FROM registrations r WHERE r.workshop_id = w.id AND r.status = 'active') < w.capacity
      ) AS available_workshops_count
  `);
  return result.rows[0];
}

module.exports = { list, findById, create, update, getDashboardStats };
