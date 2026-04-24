const pool = require('../utils/db');

// Get all sections for a class
const getSections = async (req, res) => {
    try {
        const { classId } = req.params;

        const [sections] = await pool.execute(
            'SELECT * FROM sections WHERE c_id = ? ORDER BY sec_name',
            [classId]
        );

        // Get allowed timeslots for each section
        for (const section of sections) {
            const [timeslots] = await pool.execute(
                `SELECT t.* FROM timeslots t 
                 INNER JOIN section_timeslots st ON t.timeslot_id = st.timeslot_id 
                 WHERE st.sec_id = ?`,
                [section.sec_id]
            );
            section.allowedTimeslots = timeslots;
        }

        res.json(sections);
    } catch (error) {
        console.error('Get sections error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get single section
const getSection = async (req, res) => {
    try {
        const { sectionId } = req.params;

        const [sections] = await pool.execute(
            'SELECT * FROM sections WHERE sec_id = ?',
            [sectionId]
        );

        if (sections.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }

        res.json(sections[0]);
    } catch (error) {
        console.error('Get section error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Create section
const createSection = async (req, res) => {
    try {
        const { classId } = req.params;
        const { sec_name, strength, allowedTimeslots } = req.body;

        if (!sec_name) {
            return res.status(400).json({ error: 'Section name is required' });
        }

        const [result] = await pool.execute(
            'INSERT INTO sections (c_id, sec_name, strength) VALUES (?, ?, ?)',
            [classId, sec_name, strength || 0]
        );

        const sectionId = result.insertId;

        // Add allowed timeslots
        if (allowedTimeslots && Array.isArray(allowedTimeslots)) {
            for (const timeslotId of allowedTimeslots) {
                await pool.execute(
                    'INSERT INTO section_timeslots (sec_id, timeslot_id) VALUES (?, ?)',
                    [sectionId, timeslotId]
                );
            }
        }

        // Update class no_of_sec
        const [sections] = await pool.execute(
            'SELECT COUNT(*) as count FROM sections WHERE c_id = ?',
            [classId]
        );
        await pool.execute(
            'UPDATE classes SET no_of_sec = ? WHERE c_id = ?',
            [sections[0].count, classId]
        );

        const [newSections] = await pool.execute(
            'SELECT * FROM sections WHERE sec_id = ?',
            [sectionId]
        );

        res.status(201).json(newSections[0]);
    } catch (error) {
        console.error('Create section error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Update section
const updateSection = async (req, res) => {
    try {
        const { sectionId } = req.params;
        const { sec_name, strength, allowedTimeslots } = req.body;

        await pool.execute(
            'UPDATE sections SET sec_name = ?, strength = ? WHERE sec_id = ?',
            [sec_name, strength, sectionId]
        );

        // Update allowed timeslots
        await pool.execute('DELETE FROM section_timeslots WHERE sec_id = ?', [sectionId]);
        if (allowedTimeslots && Array.isArray(allowedTimeslots)) {
            for (const timeslotId of allowedTimeslots) {
                await pool.execute(
                    'INSERT INTO section_timeslots (sec_id, timeslot_id) VALUES (?, ?)',
                    [sectionId, timeslotId]
                );
            }
        }

        const [sections] = await pool.execute(
            'SELECT * FROM sections WHERE sec_id = ?',
            [sectionId]
        );

        res.json(sections[0]);
    } catch (error) {
        console.error('Update section error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete section
const deleteSection = async (req, res) => {
    try {
        const { sectionId } = req.params;

        // Get class ID before deletion
        const [sections] = await pool.execute(
            'SELECT c_id FROM sections WHERE sec_id = ?',
            [sectionId]
        );

        if (sections.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }

        const classId = sections[0].c_id;

        const [result] = await pool.execute(
            'DELETE FROM sections WHERE sec_id = ?',
            [sectionId]
        );

        // Update class no_of_sec
        const [sectionCount] = await pool.execute(
            'SELECT COUNT(*) as count FROM sections WHERE c_id = ?',
            [classId]
        );
        await pool.execute(
            'UPDATE classes SET no_of_sec = ? WHERE c_id = ?',
            [sectionCount[0].count, classId]
        );

        res.json({ message: 'Section deleted successfully' });
    } catch (error) {
        console.error('Delete section error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getSections,
    getSection,
    createSection,
    updateSection,
    deleteSection
};

