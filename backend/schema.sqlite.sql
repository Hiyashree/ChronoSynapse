-- ChronoSynapse SQLite Schema

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schools (
    school_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    school_name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teachers (
    t_id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    t_name TEXT NOT NULL,
    qualification TEXT,
    contactno TEXT,
    email TEXT,
    salary REAL DEFAULT 0,
    FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subjects (
    s_id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    s_name TEXT NOT NULL,
    s_code TEXT,
    FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teacher_subjects (
    t_id INTEGER,
    s_id INTEGER,
    PRIMARY KEY (t_id, s_id),
    FOREIGN KEY (t_id) REFERENCES teachers(t_id) ON DELETE CASCADE,
    FOREIGN KEY (s_id) REFERENCES subjects(s_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS classes (
    c_id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    c_name TEXT NOT NULL,
    no_of_sec INTEGER DEFAULT 0,
    t_id INTEGER,
    FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE,
    FOREIGN KEY (t_id) REFERENCES teachers(t_id) ON DELETE SET NULL,
    UNIQUE (t_id)
);

CREATE TABLE IF NOT EXISTS sections (
    sec_id INTEGER PRIMARY KEY AUTOINCREMENT,
    c_id INTEGER NOT NULL,
    sec_name TEXT NOT NULL,
    strength INTEGER DEFAULT 0,
    FOREIGN KEY (c_id) REFERENCES classes(c_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS classrooms (
    room_id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    room_no TEXT NOT NULL,
    capacity INTEGER,
    type TEXT,
    FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS timeslots (
    timeslot_id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    day TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    total_time INTEGER,
    FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS timetable (
    timetable_id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    t_id INTEGER NOT NULL,
    s_id INTEGER NOT NULL,
    sec_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    timeslot_id INTEGER NOT NULL,
    FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE,
    FOREIGN KEY (t_id) REFERENCES teachers(t_id) ON DELETE CASCADE,
    FOREIGN KEY (s_id) REFERENCES subjects(s_id) ON DELETE CASCADE,
    FOREIGN KEY (sec_id) REFERENCES sections(sec_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES classrooms(room_id) ON DELETE CASCADE,
    FOREIGN KEY (timeslot_id) REFERENCES timeslots(timeslot_id) ON DELETE CASCADE,
    UNIQUE (sec_id, timeslot_id),
    UNIQUE (room_id, timeslot_id)
);

CREATE TABLE IF NOT EXISTS class_subjects (
    c_id INTEGER,
    s_id INTEGER,
    PRIMARY KEY (c_id, s_id),
    FOREIGN KEY (c_id) REFERENCES classes(c_id) ON DELETE CASCADE,
    FOREIGN KEY (s_id) REFERENCES subjects(s_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS section_timeslots (
    sec_id INTEGER,
    timeslot_id INTEGER,
    PRIMARY KEY (sec_id, timeslot_id),
    FOREIGN KEY (sec_id) REFERENCES sections(sec_id) ON DELETE CASCADE,
    FOREIGN KEY (timeslot_id) REFERENCES timeslots(timeslot_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teacher_unavailability (
    t_id INTEGER,
    timeslot_id INTEGER,
    PRIMARY KEY (t_id, timeslot_id),
    FOREIGN KEY (t_id) REFERENCES teachers(t_id) ON DELETE CASCADE,
    FOREIGN KEY (timeslot_id) REFERENCES timeslots(timeslot_id) ON DELETE CASCADE
);
