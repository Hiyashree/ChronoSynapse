const pool = require('../utils/db');

// Get all timeslots for a school
const getTimeslots = async (req, res) => {
    try {
        const { schoolId } = req.params;

        const [timeslots] = await pool.execute(
            'SELECT * FROM timeslots WHERE school_id = ? ORDER BY day, start_time',
            [schoolId]
        );

        res.json(timeslots);
    } catch (error) {
        console.error('Get timeslots error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get single timeslot
const getTimeslot = async (req, res) => {
    try {
        const { timeslotId } = req.params;

        const [timeslots] = await pool.execute(
            'SELECT * FROM timeslots WHERE timeslot_id = ?',
            [timeslotId]
        );

        if (timeslots.length === 0) {
            return res.status(404).json({ error: 'Timeslot not found' });
        }

        res.json(timeslots[0]);
    } catch (error) {
        console.error('Get timeslot error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Create timeslot
const createTimeslot = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const { day, start_time, end_time, total_time } = req.body;

        if (!day || !start_time || !end_time) {
            return res.status(400).json({ error: 'Day, start time, and end time are required' });
        }

        // Calculate total_time if not provided
        let calculatedTotal = total_time;
        if (!calculatedTotal) {
            const start = new Date(`2000-01-01 ${start_time}`);
            const end = new Date(`2000-01-01 ${end_time}`);
            calculatedTotal = Math.round((end - start) / 60000); // Convert to minutes
        }

        const [result] = await pool.execute(
            'INSERT INTO timeslots (school_id, day, start_time, end_time, total_time) VALUES (?, ?, ?, ?, ?)',
            [schoolId, day, start_time, end_time, calculatedTotal]
        );

        const [timeslots] = await pool.execute(
            'SELECT * FROM timeslots WHERE timeslot_id = ?',
            [result.insertId]
        );

        res.status(201).json(timeslots[0]);
    } catch (error) {
        console.error('Create timeslot error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Update timeslot
const updateTimeslot = async (req, res) => {
    try {
        const { timeslotId } = req.params;
        const { day, start_time, end_time, total_time } = req.body;

        // Calculate total_time if not provided
        let calculatedTotal = total_time;
        if (!calculatedTotal && start_time && end_time) {
            const start = new Date(`2000-01-01 ${start_time}`);
            const end = new Date(`2000-01-01 ${end_time}`);
            calculatedTotal = Math.round((end - start) / 60000);
        }

        await pool.execute(
            'UPDATE timeslots SET day = ?, start_time = ?, end_time = ?, total_time = ? WHERE timeslot_id = ?',
            [day, start_time, end_time, calculatedTotal, timeslotId]
        );

        const [timeslots] = await pool.execute(
            'SELECT * FROM timeslots WHERE timeslot_id = ?',
            [timeslotId]
        );

        res.json(timeslots[0]);
    } catch (error) {
        console.error('Update timeslot error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete timeslot
const deleteTimeslot = async (req, res) => {
    try {
        const { timeslotId } = req.params;

        const [result] = await pool.execute(
            'DELETE FROM timeslots WHERE timeslot_id = ?',
            [timeslotId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Timeslot not found' });
        }

        res.json({ message: 'Timeslot deleted successfully' });
    } catch (error) {
        console.error('Delete timeslot error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getTimeslots,
    getTimeslot,
    createTimeslot,
    updateTimeslot,
    deleteTimeslot
};

