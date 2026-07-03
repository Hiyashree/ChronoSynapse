-- ChronoSynapse PostgreSQL Schema (for Render / Neon / Supabase)

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schools (
    school_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    school_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teachers (
    t_id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    t_name VARCHAR(255) NOT NULL,
    qualification VARCHAR(255),
    contactno VARCHAR(50),
    email VARCHAR(255),
    salary DECIMAL(10, 2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS subjects (
    s_id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    s_name VARCHAR(255) NOT NULL,
    s_code VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS teacher_subjects (
    t_id INTEGER REFERENCES teachers(t_id) ON DELETE CASCADE,
    s_id INTEGER REFERENCES subjects(s_id) ON DELETE CASCADE,
    PRIMARY KEY (t_id, s_id)
);

CREATE TABLE IF NOT EXISTS classes (
    c_id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    c_name VARCHAR(50) NOT NULL,
    no_of_sec INTEGER DEFAULT 0,
    t_id INTEGER UNIQUE REFERENCES teachers(t_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sections (
    sec_id SERIAL PRIMARY KEY,
    c_id INTEGER NOT NULL REFERENCES classes(c_id) ON DELETE CASCADE,
    sec_name VARCHAR(50) NOT NULL,
    strength INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS classrooms (
    room_id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    room_no VARCHAR(50) NOT NULL,
    capacity INTEGER,
    type VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS timeslots (
    timeslot_id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    day VARCHAR(20) NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    end_time VARCHAR(20) NOT NULL,
    total_time INTEGER
);

CREATE TABLE IF NOT EXISTS timetable (
    timetable_id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    t_id INTEGER NOT NULL REFERENCES teachers(t_id) ON DELETE CASCADE,
    s_id INTEGER NOT NULL REFERENCES subjects(s_id) ON DELETE CASCADE,
    sec_id INTEGER NOT NULL REFERENCES sections(sec_id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES classrooms(room_id) ON DELETE CASCADE,
    timeslot_id INTEGER NOT NULL REFERENCES timeslots(timeslot_id) ON DELETE CASCADE,
    UNIQUE (sec_id, timeslot_id),
    UNIQUE (room_id, timeslot_id)
);

CREATE TABLE IF NOT EXISTS class_subjects (
    c_id INTEGER REFERENCES classes(c_id) ON DELETE CASCADE,
    s_id INTEGER REFERENCES subjects(s_id) ON DELETE CASCADE,
    PRIMARY KEY (c_id, s_id)
);

CREATE TABLE IF NOT EXISTS section_timeslots (
    sec_id INTEGER REFERENCES sections(sec_id) ON DELETE CASCADE,
    timeslot_id INTEGER REFERENCES timeslots(timeslot_id) ON DELETE CASCADE,
    PRIMARY KEY (sec_id, timeslot_id)
);

CREATE TABLE IF NOT EXISTS teacher_unavailability (
    t_id INTEGER REFERENCES teachers(t_id) ON DELETE CASCADE,
    timeslot_id INTEGER REFERENCES timeslots(timeslot_id) ON DELETE CASCADE,
    PRIMARY KEY (t_id, timeslot_id)
);
