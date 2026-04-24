const pool = require('../utils/db');

// Get all teachers for a school
const getTeachers = async (req, res) => {
    try {
        const { schoolId } = req.params;

        const [teachers] = await pool.execute(
            'SELECT * FROM teachers WHERE school_id = ? ORDER BY t_name',
            [schoolId]
        );

       
        for (const teacher of teachers) {
            const [subjects] = await pool.execute(
                `SELECT s.s_id, s.s_name, s.s_code 
                 FROM subjects s 
                 INNER JOIN teacher_subjects ts ON s.s_id = ts.s_id 
                 WHERE ts.t_id = ?`,
                [teacher.t_id]
            );
            teacher.subjects = subjects;
        }

        res.json(teachers);
    } catch (error) {
        console.error('Get teachers error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get single teacher
const getTeacher = async (req, res) => {
    try {
        const { schoolId, teacherId } = req.params;

        const [teachers] = await pool.execute(
            'SELECT * FROM teachers WHERE t_id = ? AND school_id = ?',
            [teacherId, schoolId]
        );

        if (teachers.length === 0) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        const teacher = teachers[0];

        const [subjects] = await pool.execute(
            `SELECT s.s_id, s.s_name, s.s_code 
             FROM subjects s 
             INNER JOIN teacher_subjects ts ON s.s_id = ts.s_id 
             WHERE ts.t_id = ?`,
            [teacherId]
        );
        teacher.subjects = subjects;

        // Get unavailability
        const [unavailability] = await pool.execute(
            `SELECT t.timeslot_id, t.day, t.start_time, t.end_time 
             FROM timeslots t 
             INNER JOIN teacher_unavailability tu ON t.timeslot_id = tu.timeslot_id 
             WHERE tu.t_id = ?`,
            [teacherId]
        );
        teacher.unavailability = unavailability;

        res.json(teacher);
    } catch (error) {
        console.error('Get teacher error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Create teacher
const createTeacher = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const { t_name, qualification, contactno, email, salary, subjects, unavailability } = req.body;

        if (!t_name) {
            return res.status(400).json({ error: 'Teacher name is required' });
        }

        const [result] = await pool.execute(
            'INSERT INTO teachers (school_id, t_name, qualification, contactno, email, salary) VALUES (?, ?, ?, ?, ?, ?)',
            [schoolId, t_name, qualification || null, contactno || null, email || null, salary || 0]
        );

        const teacherId = result.insertId;

        // Add subjects
        if (subjects && Array.isArray(subjects)) {
            for (const sId of subjects) {
                await pool.execute(
                    'INSERT INTO teacher_subjects (t_id, s_id) VALUES (?, ?)',
                    [teacherId, sId]
                );
            }
        }

        // Add unavailability
        if (unavailability && Array.isArray(unavailability)) {
            for (const timeslotId of unavailability) {
                await pool.execute(
                    'INSERT INTO teacher_unavailability (t_id, timeslot_id) VALUES (?, ?)',
                    [teacherId, timeslotId]
                );
            }
        }

        const [teachers] = await pool.execute(
            'SELECT * FROM teachers WHERE t_id = ?',
            [teacherId]
        );

        res.status(201).json(teachers[0]);
    } catch (error) {
        console.error('Create teacher error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Update teacher
const updateTeacher = async (req, res) => {
    try {
        const { schoolId, teacherId } = req.params;
        const { t_name, qualification, contactno, email, salary, subjects, unavailability } = req.body;

        // Verify teacher belongs to this school
        const [existing] = await pool.execute(
            'SELECT * FROM teachers WHERE t_id = ? AND school_id = ?',
            [teacherId, schoolId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        await pool.execute(
            'UPDATE teachers SET t_name = ?, qualification = ?, contactno = ?, email = ?, salary = ? WHERE t_id = ? AND school_id = ?',
            [t_name, qualification, contactno, email, salary, teacherId, schoolId]
        );

        // Update subjects
        await pool.execute('DELETE FROM teacher_subjects WHERE t_id = ?', [teacherId]);
        if (subjects && Array.isArray(subjects)) {
            for (const sId of subjects) {
                await pool.execute(
                    'INSERT INTO teacher_subjects (t_id, s_id) VALUES (?, ?)',
                    [teacherId, sId]
                );
            }
        }

        // Update unavailability
        await pool.execute('DELETE FROM teacher_unavailability WHERE t_id = ?', [teacherId]);
        if (unavailability && Array.isArray(unavailability)) {
            for (const timeslotId of unavailability) {
                await pool.execute(
                    'INSERT INTO teacher_unavailability (t_id, timeslot_id) VALUES (?, ?)',
                    [teacherId, timeslotId]
                );
            }
        }

        const [teachers] = await pool.execute(
            'SELECT * FROM teachers WHERE t_id = ?',
            [teacherId]
        );

        res.json(teachers[0]);
    } catch (error) {
        console.error('Update teacher error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete teacher
const deleteTeacher = async (req, res) => {
    try {
        const { schoolId, teacherId } = req.params;

        const [result] = await pool.execute(
            'DELETE FROM teachers WHERE t_id = ? AND school_id = ?',
            [teacherId, schoolId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        console.error('Delete teacher error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getTeachers,
    getTeacher,
    createTeacher,
    updateTeacher,
    deleteTeacher
};

