const pool = require('../utils/db');

const ensureTeacherAvailable = async (schoolId, teacherId, excludeClassId = null) => {
    if (!teacherId) return null;

    const [teacher] = await pool.execute(
        'SELECT t_id FROM teachers WHERE t_id = ? AND school_id = ?',
        [teacherId, schoolId]
    );
    if (teacher.length === 0) {
        return 'Selected teacher does not belong to this school.';
    }

    let query = 'SELECT c_id, c_name FROM classes WHERE t_id = ? AND school_id = ?';
    const params = [teacherId, schoolId];
    if (excludeClassId) {
        query += ' AND c_id != ?';
        params.push(excludeClassId);
    }

    const [existing] = await pool.execute(query, params);
    if (existing.length > 0) {
        return `Teacher is already assigned as class teacher for ${existing[0].c_name}.`;
    }

    return null;
};


const getClasses = async (req, res) => {
    try {
        const { schoolId } = req.params;

        const [classes] = await pool.execute(
            `SELECT c.*, t.t_name as class_teacher_name 
             FROM classes c 
             LEFT JOIN teachers t ON c.t_id = t.t_id 
             WHERE c.school_id = ? 
             ORDER BY c.c_name`,
            [schoolId]
        );

    
        for (const cls of classes) {
            const [sections] = await pool.execute(
                'SELECT * FROM sections WHERE c_id = ?',
                [cls.c_id]
            );
            cls.sections = sections;

            const [subjects] = await pool.execute(
                `SELECT s.* FROM subjects s 
                 INNER JOIN class_subjects cs ON s.s_id = cs.s_id 
                 WHERE cs.c_id = ?`,
                [cls.c_id]
            );
            cls.subjects = subjects;
        }

        res.json(classes);
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};


const getClass = async (req, res) => {
    try {
        const { schoolId, classId } = req.params;

        const [classes] = await pool.execute(
            `SELECT c.*, t.t_name as class_teacher_name 
             FROM classes c 
             LEFT JOIN teachers t ON c.t_id = t.t_id 
             WHERE c.c_id = ? AND c.school_id = ?`,
            [classId, schoolId]
        );

        if (classes.length === 0) {
            return res.status(404).json({ error: 'Class not found' });
        }

        const cls = classes[0];

        const [sections] = await pool.execute(
            'SELECT * FROM sections WHERE c_id = ?',
            [classId]
        );
        cls.sections = sections;

        const [subjects] = await pool.execute(
            `SELECT s.* FROM subjects s 
             INNER JOIN class_subjects cs ON s.s_id = cs.s_id 
             WHERE cs.c_id = ?`,
            [classId]
        );
        cls.subjects = subjects;

        res.json(cls);
    } catch (error) {
        console.error('Get class error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Create class
const createClass = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const { c_name, t_id, subjects } = req.body;

        if (!c_name) {
            return res.status(400).json({ error: 'Class name is required' });
        }

        const teacherConflict = await ensureTeacherAvailable(schoolId, t_id);
        if (teacherConflict) {
            return res.status(400).json({ error: teacherConflict });
        }

        const [result] = await pool.execute(
            'INSERT INTO classes (school_id, c_name, no_of_sec, t_id) VALUES (?, ?, ?, ?)',
            [schoolId, c_name, 0, t_id || null]
        );

        const classId = result.insertId;

        // Add subjects
        if (subjects && Array.isArray(subjects)) {
            for (const sId of subjects) {
                await pool.execute(
                    'INSERT INTO class_subjects (c_id, s_id) VALUES (?, ?)',
                    [classId, sId]
                );
            }
        }

        const [classes] = await pool.execute(
            `SELECT c.*, t.t_name as class_teacher_name 
             FROM classes c 
             LEFT JOIN teachers t ON c.t_id = t.t_id 
             WHERE c.c_id = ? AND c.school_id = ?`,
            [classId, schoolId]
        );

        res.status(201).json(classes[0]);
    } catch (error) {
        console.error('Create class error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Update class
const updateClass = async (req, res) => {
    try {
        const { schoolId, classId } = req.params;
        const { c_name, t_id, subjects } = req.body;

        const [existingClasses] = await pool.execute(
            'SELECT * FROM classes WHERE c_id = ? AND school_id = ?',
            [classId, schoolId]
        );
        if (existingClasses.length === 0) {
            return res.status(404).json({ error: 'Class not found' });
        }

        const teacherConflict = await ensureTeacherAvailable(schoolId, t_id, classId);
        if (teacherConflict) {
            return res.status(400).json({ error: teacherConflict });
        }

        const newName = c_name || existingClasses[0].c_name;

        await pool.execute(
            'UPDATE classes SET c_name = ?, t_id = ? WHERE c_id = ? AND school_id = ?',
            [newName, t_id || null, classId, schoolId]
        );

        // Update subjects
        await pool.execute('DELETE FROM class_subjects WHERE c_id = ?', [classId]);
        if (subjects && Array.isArray(subjects)) {
            for (const sId of subjects) {
                await pool.execute(
                    'INSERT INTO class_subjects (c_id, s_id) VALUES (?, ?)',
                    [classId, sId]
                );
            }
        }

        // Update no_of_sec
        const [sections] = await pool.execute(
            'SELECT COUNT(*) as count FROM sections WHERE c_id = ?',
            [classId]
        );
        await pool.execute(
            'UPDATE classes SET no_of_sec = ? WHERE c_id = ?',
            [sections[0].count, classId]
        );

        const [classes] = await pool.execute(
            `SELECT c.*, t.t_name as class_teacher_name 
             FROM classes c 
             LEFT JOIN teachers t ON c.t_id = t.t_id 
             WHERE c.c_id = ? AND c.school_id = ?`,
            [classId, schoolId]
        );

        res.json(classes[0]);
    } catch (error) {
        console.error('Update class error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete class
const deleteClass = async (req, res) => {
    try {
        const { schoolId, classId } = req.params;

        const [result] = await pool.execute(
            'DELETE FROM classes WHERE c_id = ? AND school_id = ?',
            [classId, schoolId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Class not found' });
        }

        res.json({ message: 'Class deleted successfully' });
    } catch (error) {
        console.error('Delete class error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getClasses,
    getClass,
    createClass,
    updateClass,
    deleteClass
};

