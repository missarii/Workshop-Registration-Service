'use strict';

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'workshop_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function runSchema(client) {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  await client.query(sql);
  console.log('✅ Schema applied.');
}

async function seedAdmin(client) {
  const existing = await client.query(
    `SELECT id FROM users WHERE email = $1`,
    ['admin@workshop.local']
  );
  if (existing.rowCount > 0) {
    console.log('ℹ️  Admin user already exists, skipping.');
    return existing.rows[0].id;
  }
  const hash = await bcrypt.hash('Admin@1234', 12);
  const result = await client.query(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, 'admin', true)
     RETURNING id`,
    ['System Administrator', 'admin@workshop.local', hash]
  );
  console.log('✅ Admin user seeded: admin@workshop.local / Admin@1234');
  return result.rows[0].id;
}

async function seedManager(client, adminId) {
  const existing = await client.query(
    `SELECT id FROM users WHERE email = $1`,
    ['manager@workshop.local']
  );
  if (existing.rowCount > 0) {
    console.log('ℹ️  Manager user already exists, skipping.');
    return existing.rows[0].id;
  }
  const hash = await bcrypt.hash('Manager@1234', 12);
  const result = await client.query(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, 'manager', true)
     RETURNING id`,
    ['Workshop Manager', 'manager@workshop.local', hash]
  );
  console.log('✅ Manager user seeded: manager@workshop.local / Manager@1234');
  return result.rows[0].id;
}

async function seedStaff(client) {
  const existing = await client.query(
    `SELECT id FROM users WHERE email = $1`,
    ['staff@workshop.local']
  );
  if (existing.rowCount > 0) {
    console.log('ℹ️  Staff user already exists, skipping.');
    return existing.rows[0].id;
  }
  const hash = await bcrypt.hash('Staff@1234', 12);
  const result = await client.query(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, 'staff', true)
     RETURNING id`,
    ['Staff Member', 'staff@workshop.local', hash]
  );
  console.log('✅ Staff user seeded: staff@workshop.local / Staff@1234');
  return result.rows[0].id;
}

async function seedWorkshops(client, managerId) {
  const existing = await client.query(`SELECT COUNT(*) FROM workshops`);
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('ℹ️  Workshops already exist, skipping workshop seed.');
    return;
  }

  const workshops = [
    {
      code: 'WS-001',
      title: 'Python Fundamentals',
      description: 'An introduction to Python programming covering variables, loops, functions and basic data structures.',
      instructor: 'Dr. Amara Silva',
      location: 'Main Hall, Kandy',
      starts_at: '2026-10-17T09:00:00+05:30',
      ends_at: '2026-10-17T17:00:00+05:30',
      capacity: 20,
      status: 'scheduled',
    },
    {
      code: 'WS-002',
      title: 'Web Design Essentials',
      description: 'Learn modern HTML5, CSS3, and responsive design principles to build professional web pages.',
      instructor: 'Ms. Priya Mendis',
      location: 'Lab 2, Colombo',
      starts_at: '2026-10-18T10:00:00+05:30',
      ends_at: '2026-10-18T16:00:00+05:30',
      capacity: 15,
      status: 'scheduled',
    },
    {
      code: 'WS-003',
      title: 'Data Analysis with Excel',
      description: 'Master pivot tables, VLOOKUP, charts and data visualisation techniques in Microsoft Excel.',
      instructor: 'Mr. Ruwan Jayawardena',
      location: 'Training Room A, Colombo',
      starts_at: '2026-10-24T09:00:00+05:30',
      ends_at: '2026-10-24T14:00:00+05:30',
      capacity: 25,
      status: 'scheduled',
    },
    {
      code: 'WS-004',
      title: 'Digital Photography Basics',
      description: 'Understand camera settings, composition, lighting and basic photo editing techniques.',
      instructor: 'Ms. Nimal Rathnayake',
      location: 'Studio 1, Kandy',
      starts_at: '2026-10-25T13:00:00+05:30',
      ends_at: '2026-10-25T17:00:00+05:30',
      capacity: 12,
      status: 'scheduled',
    },
    {
      code: 'WS-005',
      title: 'Project Management Fundamentals',
      description: 'Introduction to project planning, scheduling, risk management, and team coordination.',
      instructor: 'Dr. Kumari Perera',
      location: 'Conference Room, Galle',
      starts_at: '2026-11-07T09:00:00+05:30',
      ends_at: '2026-11-07T17:00:00+05:30',
      capacity: 30,
      status: 'scheduled',
    },
    {
      code: 'WS-006',
      title: 'Public Speaking & Presentation',
      description: 'Build confidence and develop effective communication skills for professional presentations.',
      instructor: 'Mr. Sanjay Fernando',
      location: 'Auditorium, Colombo',
      starts_at: '2026-11-14T10:00:00+05:30',
      ends_at: '2026-11-14T16:00:00+05:30',
      capacity: 40,
      status: 'scheduled',
    },
    {
      code: 'WS-007',
      title: 'Cybersecurity Awareness',
      description: 'Understand common cyber threats, safe practices, and how to protect organisational data.',
      instructor: 'Mr. Tharaka Bandara',
      location: 'Lab 3, Colombo',
      starts_at: '2026-10-16T09:00:00+05:30',
      ends_at: '2026-10-16T13:00:00+05:30',
      capacity: 5,
      status: 'scheduled',
    },
  ];

  for (const ws of workshops) {
    await client.query(
      `INSERT INTO workshops (code, title, description, instructor, location, starts_at, ends_at, capacity, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [ws.code, ws.title, ws.description, ws.instructor, ws.location,
       ws.starts_at, ws.ends_at, ws.capacity, ws.status, managerId]
    );
  }
  console.log(`✅ Seeded ${workshops.length} sample workshops.`);
}

async function main() {
  const client = await pool.connect();
  try {
    await runSchema(client);
    const adminId = await seedAdmin(client);
    const managerId = await seedManager(client, adminId);
    await seedStaff(client);
    await seedWorkshops(client, managerId);
    console.log('\n🎉 Seed complete!\n');
    console.log('Seeded credentials:');
    console.log('  Admin:   admin@workshop.local   / Admin@1234');
    console.log('  Manager: manager@workshop.local / Manager@1234');
    console.log('  Staff:   staff@workshop.local   / Staff@1234');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
