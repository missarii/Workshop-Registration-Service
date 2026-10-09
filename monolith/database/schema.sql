-- Workshop Registration Service — Database Schema
-- Run this file to set up the database tables.

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL UNIQUE,
  password_hash TEXT      NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'staff'
                CHECK (role IN ('admin', 'manager', 'staff')),
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WORKSHOPS
-- ============================================================
CREATE TABLE IF NOT EXISTS workshops (
  id          SERIAL PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,
  title       TEXT        NOT NULL,
  description TEXT,
  instructor  TEXT        NOT NULL,
  location    TEXT        NOT NULL,
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  capacity    INTEGER     NOT NULL CHECK (capacity > 0),
  status      TEXT        NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  created_by  INTEGER     NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REGISTRATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS registrations (
  id               SERIAL PRIMARY KEY,
  workshop_id      INTEGER     NOT NULL REFERENCES workshops(id),
  attendee_name    TEXT        NOT NULL,
  attendee_email   TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'cancelled')),
  registered_by    INTEGER     NOT NULL REFERENCES users(id),
  registered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_by     INTEGER     REFERENCES users(id),
  cancelled_at     TIMESTAMPTZ,
  notes            TEXT
);

-- ============================================================
-- AUDIT LOGS (bonus)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL PRIMARY KEY,
  actor_id    INTEGER     REFERENCES users(id),
  action      TEXT        NOT NULL,
  entity_type TEXT        NOT NULL,
  entity_id   INTEGER,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SESSIONS (for connect-pg-simple)
-- ============================================================
CREATE TABLE IF NOT EXISTS "session" (
  sid    VARCHAR    NOT NULL COLLATE "default",
  sess   JSON       NOT NULL,
  expire TIMESTAMPTZ NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" (expire);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_registrations_workshop_status
  ON registrations (workshop_id, status);

CREATE INDEX IF NOT EXISTS idx_workshops_status
  ON workshops (status);

CREATE INDEX IF NOT EXISTS idx_workshops_starts_at
  ON workshops (starts_at);
