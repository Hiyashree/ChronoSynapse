-- Step 1: Create Database
CREATE DATABASE IF NOT EXISTS timetable_titan;
USE timetable_titan;

-- Step 2: Create All Tables

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
    school_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    school_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
    t_id INT AUTO_INCREMENT PRIMARY KEY,
    school_id INT NOT NULL,
    t_name VARCHAR(255) NOT NULL,
    qualification VARCHAR(255),
    contactno VARCHAR(50),
    email VARCHAR(255),
    salary DECIMAL(10, 2) DEFAULT 0,
    FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
    s_id INT AUTO_INCREMENT PRIMARY KEY,
    school_id INT NOT NULL,
    s_name VARCHAR(255) NOT NULL,
    s_code VARCHAR(50),
    FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
);

-- Teacher-Subject relationship (M:N)
CREATE TABLE IF NOT EXISTS teacher_subjects (
    t_id INT,
    s_id INT,
    PRIMARY KEY (t_id, s_id),
    FOREIGN KEY (t_id) REFERENCES teachers(t_id) ON DELETE CASCADE,
    FOREIGN KEY (s_id) REFERENCES subjects(s_id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS classes (
    c_id INT AUTO_INCREMENT PRIMARY KEY,
    school_id INT NOT NULL,
    c_name VARCHAR(50) NOT NULL,
    no_of_sec INT DEFAULT 0,
    t_id INT, 
    FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE,
    FOREIGN KEY (t_id) REFERENCES teachers(t_id) ON DELETE SET NULL,
    UNIQUE KEY unique_class_teacher (t_id)
);


CREATE TABLE IF NOT EXISTS sections (
    sec_id INT AUTO_INCREMENT PRIMARY KEY,
    c_id INT NOT NULL,
    sec_name VARCHAR(50) NOT NULL,
    strength INT DEFAULT 0,
    FOREIGN KEY (c_id) REFERENCES classes(c_id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS classrooms (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    school_id INT NOT NULL,
    room_no VARCHAR(50) NOT NULL,
    capacity INT,
    type VARCHAR(100),
    FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
);

-- Timeslots table
CREATE TABLE IF NOT EXISTS timeslots (
    timeslot_id INT AUTO_INCREMENT PRIMARY KEY,
    school_id INT NOT NULL,
    day VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_time INT, -- in minutes
    FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
);

-- Timetable table
CREATE TABLE IF NOT EXISTS timetable (
    timetable_id INT AUTO_INCREMENT PRIMARY KEY,
    school_id INT NOT NULL,
    t_id INT NOT NULL,
    s_id INT NOT NULL,
    sec_id INT NOT NULL,
    room_id INT NOT NULL,
    timeslot_id INT NOT NULL,
    FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE,
    FOREIGN KEY (t_id) REFERENCES teachers(t_id) ON DELETE CASCADE,
    FOREIGN KEY (s_id) REFERENCES subjects(s_id) ON DELETE CASCADE,
    FOREIGN KEY (sec_id) REFERENCES sections(sec_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES classrooms(room_id) ON DELETE CASCADE,
    FOREIGN KEY (timeslot_id) REFERENCES timeslots(timeslot_id) ON DELETE CASCADE,
    UNIQUE KEY unique_section_timeslot (sec_id, timeslot_id),
    UNIQUE KEY unique_room_timeslot (room_id, timeslot_id)
);

-- Class-Subject relationship (M:N) - which subjects are allowed for a class
CREATE TABLE IF NOT EXISTS class_subjects (
    c_id INT,
    s_id INT,
    PRIMARY KEY (c_id, s_id),
    FOREIGN KEY (c_id) REFERENCES classes(c_id) ON DELETE CASCADE,
    FOREIGN KEY (s_id) REFERENCES subjects(s_id) ON DELETE CASCADE
);

-- Section-Timeslot allowed relationship (optional - for section-specific timeslot constraints)
CREATE TABLE IF NOT EXISTS section_timeslots (
    sec_id INT,
    timeslot_id INT,
    PRIMARY KEY (sec_id, timeslot_id),
    FOREIGN KEY (sec_id) REFERENCES sections(sec_id) ON DELETE CASCADE,
    FOREIGN KEY (timeslot_id) REFERENCES timeslots(timeslot_id) ON DELETE CASCADE
);

-- Teacher unavailability (M:N)
CREATE TABLE IF NOT EXISTS teacher_unavailability (
    t_id INT,
    timeslot_id INT,
    PRIMARY KEY (t_id, timeslot_id),
    FOREIGN KEY (t_id) REFERENCES teachers(t_id) ON DELETE CASCADE,
    FOREIGN KEY (timeslot_id) REFERENCES timeslots(timeslot_id) ON DELETE CASCADE
);
