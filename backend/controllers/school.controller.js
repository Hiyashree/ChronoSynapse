const pool = require('../utils/db');

// Get all schools for a user
const getSchools = async (req, res) => {
    try {
        let userId = req.userId || req.query.userId; // Support guest mode

        console.log('Get schools - userId:', userId, 'query:', req.query);

        // For guest mode, use a special guest user ID from query
        if (!userId) {
            userId = req.query.guestId || null;
        }

        // If no userId provided (no authenticated user and no guestId), return empty array
        // No automatic school creation or guest user lookup
        if (!userId) {
            console.log('No userId provided, returning empty array');
            return res.json([]);
        }

        const [schools] = await pool.execute(
            'SELECT * FROM schools WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        console.log(`Found ${schools.length} schools for user ${userId}`);
        // Include userId in each school for frontend reference (using camelCase for JS)
        schools.forEach(school => {
            school.userId = school.user_id || userId;
        });
        res.json(schools);
    } catch (error) {
        console.error('Get schools error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
};

// Get single school
const getSchool = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const userId = req.userId || req.query.userId;

        const [schools] = await pool.execute(
            'SELECT * FROM schools WHERE school_id = ? AND user_id = ?',
            [schoolId, userId]
        );

        if (schools.length === 0) {
            return res.status(404).json({ error: 'School not found' });
        }

        res.json(schools[0]);
    } catch (error) {
        console.error('Get school error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Create school
const createSchool = async (req, res) => {
    try {
        console.log('Create school request:', req.body);
        const { schoolName } = req.body;
        let userId = req.userId || req.body.userId || req.body.guestId;

        if (!schoolName) {
            return res.status(400).json({ error: 'School name is required' });
        }

        // For guest mode, create a temporary user or use guest ID
        if (!userId) {
            console.log('Creating guest user...');
            // Create a guest user entry
            const [guestUser] = await pool.execute(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                [`guest_${Date.now()}`, `guest_${Date.now()}@guest.com`, 'guest']
            );
            userId = guestUser.insertId;
            console.log('Guest user created with ID:', userId);
        }

        console.log('Creating school with userId:', userId, 'name:', schoolName);
        const [result] = await pool.execute(
            'INSERT INTO schools (user_id, school_name) VALUES (?, ?)',
            [userId, schoolName]
        );

        const schoolId = result.insertId;
        console.log('School created with ID:', schoolId);

        // ALWAYS create default timeslots for every school (independent of sample data)
        try {
            await createDefaultTimeslots(schoolId);
            console.log('Default timeslots created successfully');
        } catch (timeslotError) {
            console.error('Error creating default timeslots:', timeslotError);
            // Continue even if timeslots fail, but this is critical
        }

        // Add sample data (optional - can be removed if not needed)
        try {
            await addSampleData(schoolId);
            console.log('Sample data added successfully');
        } catch (sampleError) {
            console.error('Error adding sample data:', sampleError);
            // Continue even if sample data fails
        }

        const [schools] = await pool.execute(
            'SELECT * FROM schools WHERE school_id = ?',
            [schoolId]
        );

        const schoolData = schools[0];
        // Include userId in response so frontend can use it
        schoolData.userId = userId;

        console.log('School created successfully:', schoolData);
        res.status(201).json(schoolData);
    } catch (error) {
        console.error('Create school error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
};

// Delete school
const deleteSchool = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const userId = req.userId || req.query.userId;

        const [result] = await pool.execute(
            'DELETE FROM schools WHERE school_id = ? AND user_id = ?',
            [schoolId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'School not found' });
        }

        res.json({ message: 'School deleted successfully' });
    } catch (error) {
        console.error('Delete school error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Create default timeslots for every school (Monday to Saturday)
// This ensures all users have the same time structure independently
const createDefaultTimeslots = async (schoolId) => {
    try {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const timeSlots = [
            ['09:00:00', '09:50:00', 50],  // 9:00 AM - 9:50 AM
            ['10:00:00', '10:50:00', 50],  // 10:00 AM - 10:50 AM
            ['11:00:00', '11:50:00', 50],  // 11:00 AM - 11:50 AM
            ['12:00:00', '13:00:00', 60],  // 12:00 PM - 1:00 PM (Lunch)
            ['13:00:00', '13:50:00', 50],  // 1:00 PM - 1:50 PM
            ['14:00:00', '14:50:00', 50]   // 2:00 PM - 2:50 PM
        ];

        for (const day of days) {
            for (const [start, end, total] of timeSlots) {
                await pool.execute(
                    'INSERT INTO timeslots (school_id, day, start_time, end_time, total_time) VALUES (?, ?, ?, ?, ?)',
                    [schoolId, day, start, end, total]
                );
            }
        }
        console.log(`Created ${days.length * timeSlots.length} default timeslots for school ${schoolId}`);
    } catch (error) {
        console.error('Error creating default timeslots:', error);
        throw error;
    }
};

// Add sample data to new school (teachers, subjects, classes, etc.)
// This is optional and separate from timeslots
const addSampleData = async (schoolId) => {
    try {
        // Add sample subjects
        const subjects = [
            ['MIL', 'MIL101'],
            ['Social Science', 'SOC101'],
            ['Science', 'SCI101'],
            ['MATHS', 'MATH101'],
            ['ENGLISH', 'ENG101']
        ];

        for (const [name, code] of subjects) {
            await pool.execute(
                'INSERT INTO subjects (school_id, s_name, s_code) VALUES (?, ?, ?)',
                [schoolId, name, code]
            );
        }

        // Add sample teachers
        const teachers = [
            ['Hemen Baishya', 'B.SC', '123-456-7890', 'example@gmail.com', 75000],
            ['DIGANTA SARMA', 'B.SC', '123-456-7890', 'example@gmail.com', 89999],
            ['jyotish doloi', 'B.SC', '123-456-7890', 'example@gmail.com', 75000]
        ];

        for (const [name, qual, contact, email, salary] of teachers) {
            await pool.execute(
                'INSERT INTO teachers (school_id, t_name, qualification, contactno, email, salary) VALUES (?, ?, ?, ?, ?, ?)',
                [schoolId, name, qual, contact, email, salary]
            );
        }

        // Add sample classrooms
        await pool.execute(
            'INSERT INTO classrooms (school_id, room_no, capacity, type) VALUES (?, ?, ?, ?)',
            [schoolId, '101', 40, 'Regular']
        );
        await pool.execute(
            'INSERT INTO classrooms (school_id, room_no, capacity, type) VALUES (?, ?, ?, ?)',
            [schoolId, '102', 35, 'Regular']
        );

        // Note: Timeslots are now created separately via createDefaultTimeslots()
        // This ensures every school gets timeslots regardless of sample data

        // Add sample class (assign first teacher as class teacher)
        const [teacherIdsForClass] = await pool.execute(
            'SELECT t_id FROM teachers WHERE school_id = ? LIMIT 1',
            [schoolId]
        );
        const classTeacherId = teacherIdsForClass.length > 0 ? teacherIdsForClass[0].t_id : null;
        
        const [classResult] = await pool.execute(
            'INSERT INTO classes (school_id, c_name, no_of_sec, t_id) VALUES (?, ?, ?, ?)',
            [schoolId, '10', 2, classTeacherId]
        );

        const classId = classResult.insertId;

        // Add sample sections
        await pool.execute(
            'INSERT INTO sections (c_id, sec_name, strength) VALUES (?, ?, ?)',
            [classId, '10a', 30]
        );
        await pool.execute(
            'INSERT INTO sections (c_id, sec_name, strength) VALUES (?, ?, ?)',
            [classId, '10b', 20]
        );

        // Link subjects to class
        const [subjectIds] = await pool.execute(
            'SELECT s_id FROM subjects WHERE school_id = ?',
            [schoolId]
        );

        for (const subject of subjectIds) {
            await pool.execute(
                'INSERT INTO class_subjects (c_id, s_id) VALUES (?, ?)',
                [classId, subject.s_id]
            );
        }

        // Link teachers to subjects (assign multiple subjects to each teacher)
        const [teacherIds] = await pool.execute(
            'SELECT t_id FROM teachers WHERE school_id = ?',
            [schoolId]
        );

        if (teacherIds.length > 0 && subjectIds.length > 0) {
            // Teacher 1: MIL, Science, English
            if (subjectIds[0]) await pool.execute('INSERT INTO teacher_subjects (t_id, s_id) VALUES (?, ?)', [teacherIds[0].t_id, subjectIds[0].s_id]);
            if (subjectIds[2]) await pool.execute('INSERT INTO teacher_subjects (t_id, s_id) VALUES (?, ?)', [teacherIds[0].t_id, subjectIds[2].s_id]);
            if (subjectIds[4]) await pool.execute('INSERT INTO teacher_subjects (t_id, s_id) VALUES (?, ?)', [teacherIds[0].t_id, subjectIds[4].s_id]);
            
            // Teacher 2: Social Science, Science
            if (teacherIds.length > 1) {
                if (subjectIds[1]) await pool.execute('INSERT INTO teacher_subjects (t_id, s_id) VALUES (?, ?)', [teacherIds[1].t_id, subjectIds[1].s_id]);
                if (subjectIds[2]) await pool.execute('INSERT INTO teacher_subjects (t_id, s_id) VALUES (?, ?)', [teacherIds[1].t_id, subjectIds[2].s_id]);
            }
            
            // Teacher 3: MATHS, English
            if (teacherIds.length > 2) {
                if (subjectIds[3]) await pool.execute('INSERT INTO teacher_subjects (t_id, s_id) VALUES (?, ?)', [teacherIds[2].t_id, subjectIds[3].s_id]);
                if (subjectIds[4]) await pool.execute('INSERT INTO teacher_subjects (t_id, s_id) VALUES (?, ?)', [teacherIds[2].t_id, subjectIds[4].s_id]);
            }
        }
    } catch (error) {
        console.error('Error adding sample data:', error);
    }
};

module.exports = {
    getSchools,
    getSchool,
    createSchool,
    deleteSchool
};

