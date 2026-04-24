const pool = require('../utils/db');

// Get all classrooms for a school
const getClassrooms = async (req, res) => {
    try {
        const { schoolId } = req.params;

        const [classrooms] = await pool.execute(
            'SELECT * FROM classrooms WHERE school_id = ? ORDER BY room_no',
            [schoolId]
        );

        res.json(classrooms);
    } catch (error) {
        console.error('Get classrooms error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get single classroom
const getClassroom = async (req, res) => {
    try {
        const { classroomId } = req.params;

        const [classrooms] = await pool.execute(
            'SELECT * FROM classrooms WHERE room_id = ?',
            [classroomId]
        );

        if (classrooms.length === 0) {
            return res.status(404).json({ error: 'Classroom not found' });
        }

        res.json(classrooms[0]);
    } catch (error) {
        console.error('Get classroom error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Create classroom
const createClassroom = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const { room_no, capacity, type } = req.body;

        if (!room_no) {
            return res.status(400).json({ error: 'Room number is required' });
        }

        const [result] = await pool.execute(
            'INSERT INTO classrooms (school_id, room_no, capacity, type) VALUES (?, ?, ?, ?)',
            [schoolId, room_no, capacity || null, type || null]
        );

        const [classrooms] = await pool.execute(
            'SELECT * FROM classrooms WHERE room_id = ?',
            [result.insertId]
        );

        res.status(201).json(classrooms[0]);
    } catch (error) {
        console.error('Create classroom error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Update classroom
const updateClassroom = async (req, res) => {
    try {
        const { classroomId } = req.params;
        const { room_no, capacity, type } = req.body;

        await pool.execute(
            'UPDATE classrooms SET room_no = ?, capacity = ?, type = ? WHERE room_id = ?',
            [room_no, capacity, type, classroomId]
        );

        const [classrooms] = await pool.execute(
            'SELECT * FROM classrooms WHERE room_id = ?',
            [classroomId]
        );

        res.json(classrooms[0]);
    } catch (error) {
        console.error('Update classroom error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete classroom
const deleteClassroom = async (req, res) => {
    try {
        const { classroomId } = req.params;

        const [result] = await pool.execute(
            'DELETE FROM classrooms WHERE room_id = ?',
            [classroomId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Classroom not found' });
        }

        res.json({ message: 'Classroom deleted successfully' });
    } catch (error) {
        console.error('Delete classroom error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getClassrooms,
    getClassroom,
    createClassroom,
    updateClassroom,
    deleteClassroom
};

