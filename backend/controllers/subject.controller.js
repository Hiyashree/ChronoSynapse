const pool = require('../utils/db');

// Get all subjects for a school
const getSubjects = async (req, res) => {
    try {
        const { schoolId } = req.params;

        const [subjects] = await pool.execute(
            'SELECT * FROM subjects WHERE school_id = ? ORDER BY s_name',
            [schoolId]
        );

        res.json(subjects);
    } catch (error) {
        console.error('Get subjects error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get single subject
const getSubject = async (req, res) => {
    try {
        const { subjectId } = req.params;

        const [subjects] = await pool.execute(
            'SELECT * FROM subjects WHERE s_id = ?',
            [subjectId]
        );

        if (subjects.length === 0) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        res.json(subjects[0]);
    } catch (error) {
        console.error('Get subject error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Create subject
const createSubject = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const { s_name, s_code } = req.body;

        if (!s_name) {
            return res.status(400).json({ error: 'Subject name is required' });
        }

        const [result] = await pool.execute(
            'INSERT INTO subjects (school_id, s_name, s_code) VALUES (?, ?, ?)',
            [schoolId, s_name, s_code || null]
        );

        const [subjects] = await pool.execute(
            'SELECT * FROM subjects WHERE s_id = ?',
            [result.insertId]
        );

        res.status(201).json(subjects[0]);
    } catch (error) {
        console.error('Create subject error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Update subject
const updateSubject = async (req, res) => {
    try {
        const { schoolId, subjectId } = req.params;
        const { s_name, s_code } = req.body;

        // Verify subject belongs to this school
        const [existing] = await pool.execute(
            'SELECT * FROM subjects WHERE s_id = ? AND school_id = ?',
            [subjectId, schoolId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        await pool.execute(
            'UPDATE subjects SET s_name = ?, s_code = ? WHERE s_id = ? AND school_id = ?',
            [s_name, s_code, subjectId, schoolId]
        );

        const [subjects] = await pool.execute(
            'SELECT * FROM subjects WHERE s_id = ?',
            [subjectId]
        );

        res.json(subjects[0]);
    } catch (error) {
        console.error('Update subject error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete subject
const deleteSubject = async (req, res) => {
    try {
        const { schoolId, subjectId } = req.params;

        const [result] = await pool.execute(
            'DELETE FROM subjects WHERE s_id = ? AND school_id = ?',
            [subjectId, schoolId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        res.json({ message: 'Subject deleted successfully' });
    } catch (error) {
        console.error('Delete subject error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getSubjects,
    getSubject,
    createSubject,
    updateSubject,
    deleteSubject
};

