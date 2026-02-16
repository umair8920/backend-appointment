-- ============================================================
-- AI-Assisted Appointment Booking System
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================== USERS =====================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- ===================== USER PROFILES =====================

CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    preferred_timezone VARCHAR(100),
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_profiles_user_id
ON user_profiles(user_id);

-- ===================== APPOINTMENTS =====================

CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    appointment_date TIMESTAMP NOT NULL,

    status VARCHAR(50) DEFAULT 'confirmed',
        -- confirmed | cancelled

    booked_via_chat BOOLEAN DEFAULT FALSE,

    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appointments_user_id
ON appointments(user_id);

CREATE INDEX idx_appointments_date
ON appointments(appointment_date);

-- IMPORTANT: Partial unique index
CREATE UNIQUE INDEX idx_unique_appointment_time
ON appointments(appointment_date)
WHERE status != 'cancelled';

-- ===================== CHAT SESSIONS =====================

CREATE TABLE chat_sessions (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    appointment_id INTEGER NULL
        REFERENCES appointments(id) ON DELETE SET NULL,

    status VARCHAR(50) DEFAULT 'active',
        -- active | completed

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_sessions_user_id
ON chat_sessions(user_id);

CREATE INDEX idx_chat_sessions_appointment_id
ON chat_sessions(appointment_id);

-- ===================== CHAT MESSAGES =====================

CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,

    session_id INTEGER NOT NULL
        REFERENCES chat_sessions(id) ON DELETE CASCADE,

    sender VARCHAR(50) NOT NULL
        CHECK (sender IN ('user', 'ai')),

    message TEXT NOT NULL,

    extracted_appointment_date TIMESTAMP NULL,
    extracted_notes TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_messages_session_id
ON chat_messages(session_id);

CREATE INDEX idx_chat_messages_created_at
ON chat_messages(created_at);