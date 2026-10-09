'use strict';

const { pool } = require('../config/db');

async function findByEmail(email) {
  const result = await pool.query(
    `SELECT id, name, email, password_hash, role, is_active
     FROM users
     WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT id, name, email, role, is_active, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function listAll() {
  const result = await pool.query(
    `SELECT id, name, email, role, is_active, created_at
     FROM users
     ORDER BY created_at ASC`
  );
  return result.rows;
}

async function create({ name, email, passwordHash, role }) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id, name, email, role, is_active, created_at`,
    [name, email, passwordHash, role]
  );
  return result.rows[0];
}

async function update(id, fields) {
  const sets = [];
  const values = [];
  let i = 1;

  if (fields.name !== undefined) { sets.push(`name = $${i++}`); values.push(fields.name); }
  if (fields.role !== undefined) { sets.push(`role = $${i++}`); values.push(fields.role); }
  if (fields.is_active !== undefined) { sets.push(`is_active = $${i++}`); values.push(fields.is_active); }

  if (sets.length === 0) throw new Error('No fields to update.');

  values.push(id);
  const result = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${i}
     RETURNING id, name, email, role, is_active, created_at`,
    values
  );
  return result.rows[0] || null;
}

async function countActiveAdmins() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS total FROM users WHERE role = 'admin' AND is_active = true`
  );
  return result.rows[0].total;
}

module.exports = { findByEmail, findById, listAll, create, update, countActiveAdmins };
