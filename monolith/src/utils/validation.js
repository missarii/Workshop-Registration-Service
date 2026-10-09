'use strict';

const { z } = require('zod');

// ──────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

// ──────────────────────────────────────────────
// Users
// ──────────────────────────────────────────────
const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(100),
  email: z.string().email('Invalid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
  role: z.enum(['admin', 'manager', 'staff'], {
    errorMap: () => ({ message: 'Role must be admin, manager, or staff.' }),
  }),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(['admin', 'manager', 'staff']).optional(),
  is_active: z.boolean().optional(),
});

// ──────────────────────────────────────────────
// Workshops
// ──────────────────────────────────────────────
const createWorkshopSchema = z.object({
  code: z
    .string()
    .min(2, 'Workshop code is required.')
    .max(20)
    .regex(/^[A-Z0-9\-]+$/, 'Code must be uppercase letters, numbers, or hyphens.'),
  title: z.string().min(3, 'Title must be at least 3 characters.').max(200),
  description: z.string().max(2000).optional(),
  instructor: z.string().min(2).max(100),
  location: z.string().min(2).max(200),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  capacity: z
    .number({ invalid_type_error: 'Capacity must be a number.' })
    .int()
    .positive('Capacity must be a positive integer.'),
  status: z.enum(['scheduled', 'cancelled', 'completed']).optional().default('scheduled'),
}).refine(
  (data) => new Date(data.ends_at) > new Date(data.starts_at),
  { message: 'End time must be after start time.', path: ['ends_at'] }
);

const updateWorkshopSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  instructor: z.string().min(2).max(100).optional(),
  location: z.string().min(2).max(200).optional(),
  starts_at: z.string().datetime({ offset: true }).optional(),
  ends_at: z.string().datetime({ offset: true }).optional(),
  capacity: z.number().int().positive().optional(),
  status: z.enum(['scheduled', 'cancelled', 'completed']).optional(),
});

// ──────────────────────────────────────────────
// Registrations
// ──────────────────────────────────────────────
const createRegistrationSchema = z.object({
  attendee_name: z.string().min(2, 'Attendee name is required.').max(100),
  attendee_email: z.string().email('Invalid attendee email.'),
  notes: z.string().max(500).optional(),
});

// ──────────────────────────────────────────────
// Validation middleware factory
// ──────────────────────────────────────────────
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(' ');
      return res.status(400).json({ error: messages });
    }
    req.validated = result.data;
    next();
  };
}

module.exports = {
  validate,
  loginSchema,
  createUserSchema,
  updateUserSchema,
  createWorkshopSchema,
  updateWorkshopSchema,
  createRegistrationSchema,
};
