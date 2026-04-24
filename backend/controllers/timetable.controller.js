const pool = require('../utils/db');

// Get timetable for sections
const getTimetable = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const { sectionIds } = req.query; // Comma-separated section IDs

        let query = `
            SELECT 
                tt.*,
                t.t_name,
                s.s_name, s.s_code,
                sec.sec_name, sec.c_id,
                c.c_name,
                r.room_no,
                ts.day, ts.start_time, ts.end_time
            FROM timetable tt
            INNER JOIN teachers t ON tt.t_id = t.t_id
            INNER JOIN subjects s ON tt.s_id = s.s_id
            INNER JOIN sections sec ON tt.sec_id = sec.sec_id
            INNER JOIN classes c ON sec.c_id = c.c_id
            INNER JOIN classrooms r ON tt.room_id = r.room_id
            INNER JOIN timeslots ts ON tt.timeslot_id = ts.timeslot_id
            WHERE tt.school_id = ?
        `;

        const params = [schoolId];

        if (sectionIds) {
            const ids = sectionIds.split(',').map(id => parseInt(id));
            query += ` AND tt.sec_id IN (${ids.map(() => '?').join(',')})`;
            params.push(...ids);
        }

        query += ' ORDER BY sec.sec_name, ts.day, ts.start_time';

        const [timetable] = await pool.execute(query, params);

        res.json(timetable);
    } catch (error) {
        console.error('Get timetable error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Generate timetable
const generateTimetable = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const { sectionIds } = req.body; // Array of section IDs

        if (!sectionIds || !Array.isArray(sectionIds) || sectionIds.length === 0) {
            return res.status(400).json({ error: 'Section IDs are required' });
        }

        // Clear existing timetable for these sections
        await pool.execute(
            `DELETE FROM timetable WHERE school_id = ? AND sec_id IN (${sectionIds.map(() => '?').join(',')})`,
            [schoolId, ...sectionIds]
        );

        // Get all required data
        const [sections] = await pool.execute(
            `SELECT sec.*, c.c_name, c.school_id
             FROM sections sec 
             INNER JOIN classes c ON sec.c_id = c.c_id 
             WHERE sec.sec_id IN (${sectionIds.map(() => '?').join(',')}) AND c.school_id = ?`,
            [...sectionIds, schoolId]
        );

        const [timeslots] = await pool.execute(
            'SELECT * FROM timeslots WHERE school_id = ? ORDER BY day, start_time',
            [schoolId]
        );

        const [teachers] = await pool.execute(
            'SELECT * FROM teachers WHERE school_id = ?',
            [schoolId]
        );

        const [subjects] = await pool.execute(
            'SELECT * FROM subjects WHERE school_id = ?',
            [schoolId]
        );

        const [classrooms] = await pool.execute(
            'SELECT * FROM classrooms WHERE school_id = ?',
            [schoolId]
        );

        // Get teacher-subject relationships (only for this school's teachers)
        const teacherIds = teachers.map(t => t.t_id);
        if (teacherIds.length === 0) {
            return res.status(400).json({ error: 'No teachers found for this school' });
        }
        
        const placeholders = teacherIds.map(() => '?').join(',');
        const [teacherSubjects] = await pool.execute(
            `SELECT * FROM teacher_subjects WHERE t_id IN (${placeholders})`,
            teacherIds
        );
        const teacherSubjectMap = {};
        teacherSubjects.forEach(ts => {
            if (!teacherSubjectMap[ts.t_id]) teacherSubjectMap[ts.t_id] = [];
            teacherSubjectMap[ts.t_id].push(ts.s_id);
        });
        
        console.log(`Teacher-subject mappings: ${Object.keys(teacherSubjectMap).length} teachers with subjects`);

        // Get teacher unavailability (only for this school's teachers)
        const [teacherUnavailability] = await pool.execute(
            `SELECT * FROM teacher_unavailability WHERE t_id IN (${placeholders})`,
            teacherIds
        );
        const teacherUnavailableMap = {};
        teacherUnavailability.forEach(tu => {
            if (!teacherUnavailableMap[tu.t_id]) teacherUnavailableMap[tu.t_id] = [];
            teacherUnavailableMap[tu.t_id].push(tu.timeslot_id);
        });

        // Get class-subject relationships (only for classes with sections we're generating)
        const classIds = [...new Set(sections.map(s => s.c_id))];
        if (classIds.length === 0) {
            return res.status(400).json({ error: 'No classes found for selected sections' });
        }
        
        const classPlaceholders = classIds.map(() => '?').join(',');
        const [classSubjects] = await pool.execute(
            `SELECT * FROM class_subjects WHERE c_id IN (${classPlaceholders})`,
            classIds
        );
        const classSubjectMap = {};
        classSubjects.forEach(cs => {
            if (!classSubjectMap[cs.c_id]) classSubjectMap[cs.c_id] = [];
            classSubjectMap[cs.c_id].push(cs.s_id);
        });
        
        console.log(`Class-subject mappings: ${Object.keys(classSubjectMap).length} classes with subjects`);

        // Get section allowed timeslots (only for sections we're generating)
        const sectionIdsList = sections.map(s => s.sec_id);
        const sectionPlaceholders = sectionIdsList.map(() => '?').join(',');
        const [sectionTimeslots] = await pool.execute(
            `SELECT * FROM section_timeslots WHERE sec_id IN (${sectionPlaceholders})`,
            sectionIdsList
        );
        const sectionTimeslotMap = {};
        sectionTimeslots.forEach(st => {
            if (!sectionTimeslotMap[st.sec_id]) sectionTimeslotMap[st.sec_id] = [];
            sectionTimeslotMap[st.sec_id].push(st.timeslot_id);
        });

        // Generate timetable using practical and efficient algorithm
        const generatedTimetable = [];
        const conflicts = [];

        console.log(`Generating timetable for ${sections.length} sections`);
        console.log(`Available: ${teachers.length} teachers, ${subjects.length} subjects, ${classrooms.length} classrooms, ${timeslots.length} timeslots`);

        // Track what's already scheduled
        const scheduled = {}; // { sectionId_timeslotId: true }
        const teacherSchedule = {}; // { teacherId_timeslotId: true }
        const roomSchedule = {}; // { roomId_timeslotId: true }
        const sectionDaySubjects = {}; // { sectionId_day: [subjectIds] } - Track subjects used per day per section
        const sectionSubjectUsage = {}; // { sectionId_subjectId: count } - Track total usage per subject per section

        // Shuffle array function
        const shuffleArray = (array) => {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        };

        // Group timeslots by day and sort by time
        const timeslotsByDay = {};
        timeslots.forEach(ts => {
            if (!timeslotsByDay[ts.day]) {
                timeslotsByDay[ts.day] = [];
            }
            timeslotsByDay[ts.day].push(ts);
        });

        // Sort timeslots within each day by start time
        Object.keys(timeslotsByDay).forEach(day => {
            timeslotsByDay[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
        });

        // Get all days in a consistent order
        const allDays = Object.keys(timeslotsByDay).sort();

        // Helper function to find available assignment
        const findAssignment = (section, timeslot, usedSubjectsToday, allowedSubjects) => {
            // Get subjects sorted by priority: unused today > least used overall
            const getSubjectPriority = (subject) => {
                const usedToday = usedSubjectsToday.includes(subject.s_id);
                const usageCount = sectionSubjectUsage[section.sec_id][subject.s_id] || 0;
                // Lower priority number = higher priority
                return {
                    subject,
                    priority: usedToday ? 1000 + usageCount : usageCount,
                    usedToday
                };
            };

            const subjectPriorities = allowedSubjects.map(getSubjectPriority)
                .sort((a, b) => a.priority - b.priority);

            // Try subjects in priority order
            for (const { subject, usedToday } of subjectPriorities) {
                // In first pass, prefer unused subjects
                // But if we're in a retry or have limited options, allow reuse
                if (usedToday && usedSubjectsToday.length > 0 && usedSubjectsToday.length < allowedSubjects.length) {
                    // Only skip if we have multiple unused options available
                    const unusedCount = allowedSubjects.filter(s => !usedSubjectsToday.includes(s.s_id)).length;
                    if (unusedCount > 1) {
                        continue; // Skip if we have other unused options
                    }
                    // If only 1 or 0 unused, allow reuse
                }

                // Find available teachers for this subject
                const availableTeachers = teachers.filter(t => {
                    const canTeach = teacherSubjectMap[t.t_id]?.includes(subject.s_id);
                    const isAvailable = !teacherUnavailableMap[t.t_id]?.includes(timeslot.timeslot_id);
                    const notScheduled = !teacherSchedule[`${t.t_id}_${timeslot.timeslot_id}`];
                    return canTeach && isAvailable && notScheduled;
                });

                if (availableTeachers.length === 0) {
                    continue;
                }

                // Find available classrooms
                const availableRooms = classrooms.filter(r => {
                    return !roomSchedule[`${r.room_id}_${timeslot.timeslot_id}`];
                });

                if (availableRooms.length === 0) {
                    continue;
                }

                // Found a valid assignment
                const teacher = availableTeachers[Math.floor(Math.random() * availableTeachers.length)];
                const room = availableRooms[Math.floor(Math.random() * availableRooms.length)];

                return { teacher, subject, room };
            }

            return null; // No assignment found
        };

        // Process each section
        for (const section of sections) {
            const classId = section.c_id;
            const allowedSubjectIds = classSubjectMap[classId] || [];
            const allowedTimeslots = sectionTimeslotMap[section.sec_id] || timeslots.map(t => t.timeslot_id);

            // Convert subject IDs to subject objects
            const allowedSubjects = subjects.filter(s => allowedSubjectIds.includes(s.s_id));

            console.log(`Section ${section.sec_name}: ${allowedSubjects.length} subjects, ${allowedTimeslots.length} timeslots`);

            if (allowedSubjects.length === 0) {
                console.warn(`No subjects assigned to class ${classId}`);
                continue;
            }

            // Initialize tracking for this section
            if (!sectionDaySubjects[section.sec_id]) {
                sectionDaySubjects[section.sec_id] = {};
            }
            if (!sectionSubjectUsage[section.sec_id]) {
                sectionSubjectUsage[section.sec_id] = {};
                allowedSubjects.forEach(s => {
                    sectionSubjectUsage[section.sec_id][s.s_id] = 0;
                });
            }

            // Collect all valid timeslots for this section (excluding lunch)
            const validTimeslots = [];
            allDays.forEach(day => {
                timeslotsByDay[day].forEach(ts => {
                    if (allowedTimeslots.includes(ts.timeslot_id) &&
                        !((ts.start_time >= '12:00:00' && ts.start_time < '13:00:00') ||
                          (ts.end_time > '12:00:00' && ts.end_time <= '13:00:00'))) {
                        validTimeslots.push(ts);
                    }
                });
            });

            // Process timeslots day by day for better distribution
            const unassignedSlots = [];
            let assignedCount = 0;
            
            // First pass: Try to assign with preference for variety
            for (const day of allDays) {
                const dayTimeslots = validTimeslots.filter(ts => ts.day === day)
                    .sort((a, b) => a.start_time.localeCompare(b.start_time));

                for (const timeslot of dayTimeslots) {
                    const key = `${section.sec_id}_${timeslot.timeslot_id}`;
                    if (scheduled[key]) continue;

                    const usedSubjectsToday = sectionDaySubjects[section.sec_id][day] || [];
                    const assignment = findAssignment(section, timeslot, usedSubjectsToday, allowedSubjects);

                    if (assignment) {
                        generatedTimetable.push({
                            school_id: schoolId,
                            t_id: assignment.teacher.t_id,
                            s_id: assignment.subject.s_id,
                            sec_id: section.sec_id,
                            room_id: assignment.room.room_id,
                            timeslot_id: timeslot.timeslot_id
                        });

                        scheduled[key] = true;
                        teacherSchedule[`${assignment.teacher.t_id}_${timeslot.timeslot_id}`] = true;
                        roomSchedule[`${assignment.room.room_id}_${timeslot.timeslot_id}`] = true;

                        if (!sectionDaySubjects[section.sec_id][day]) {
                            sectionDaySubjects[section.sec_id][day] = [];
                        }
                        sectionDaySubjects[section.sec_id][day].push(assignment.subject.s_id);
                        sectionSubjectUsage[section.sec_id][assignment.subject.s_id] = 
                            (sectionSubjectUsage[section.sec_id][assignment.subject.s_id] || 0) + 1;
                        assignedCount++;
                    } else {
                        unassignedSlots.push(timeslot);
                    }
                }
            }

            // Second pass: Try to fill remaining slots with relaxed constraints (allow any subject)
            if (unassignedSlots.length > 0) {
                console.log(`Section ${section.sec_name}: ${unassignedSlots.length} unassigned slots, attempting second pass with relaxed constraints...`);
                
                // Shuffle unassigned slots for better distribution
                const shuffledUnassigned = shuffleArray(unassignedSlots);

                for (const timeslot of shuffledUnassigned) {
                    const key = `${section.sec_id}_${timeslot.timeslot_id}`;
                    if (scheduled[key]) continue;

                    const day = timeslot.day;
                    
                    // In second pass, pass empty array to allow any subject (no day restriction)
                    const assignment = findAssignment(section, timeslot, [], allowedSubjects);

                    if (assignment) {
                        generatedTimetable.push({
                            school_id: schoolId,
                            t_id: assignment.teacher.t_id,
                            s_id: assignment.subject.s_id,
                            sec_id: section.sec_id,
                            room_id: assignment.room.room_id,
                            timeslot_id: timeslot.timeslot_id
                        });

                        scheduled[key] = true;
                        teacherSchedule[`${assignment.teacher.t_id}_${timeslot.timeslot_id}`] = true;
                        roomSchedule[`${assignment.room.room_id}_${timeslot.timeslot_id}`] = true;

                        if (!sectionDaySubjects[section.sec_id][day]) {
                            sectionDaySubjects[section.sec_id][day] = [];
                        }
                        sectionDaySubjects[section.sec_id][day].push(assignment.subject.s_id);
                        sectionSubjectUsage[section.sec_id][assignment.subject.s_id] = 
                            (sectionSubjectUsage[section.sec_id][assignment.subject.s_id] || 0) + 1;
                        assignedCount++;
                    } else {
                        // Log detailed conflict information for debugging
                        const availableTeacherCount = teachers.filter(t => {
                            const isAvailable = !teacherUnavailableMap[t.t_id]?.includes(timeslot.timeslot_id);
                            const notScheduled = !teacherSchedule[`${t.t_id}_${timeslot.timeslot_id}`];
                            return isAvailable && notScheduled;
                        }).length;
                        
                        const availableRoomCount = classrooms.filter(r => {
                            return !roomSchedule[`${r.room_id}_${timeslot.timeslot_id}`];
                        }).length;

                        conflicts.push({
                            section: section.sec_name,
                            timeslot: `${timeslot.day} ${timeslot.start_time}-${timeslot.end_time}`,
                            reason: `No assignment found. Available teachers: ${availableTeacherCount}, Available rooms: ${availableRoomCount}, Subjects: ${allowedSubjects.length}`
                        });
                    }
                }
            }
            
            const finalUnassigned = unassignedSlots.filter(ts => !scheduled[`${section.sec_id}_${ts.timeslot_id}`]).length;
            console.log(`Section ${section.sec_name}: Assigned ${assignedCount}/${validTimeslots.length} slots (${finalUnassigned} remaining conflicts)`);
        }

        console.log(`Generated ${generatedTimetable.length} timetable entries with ${conflicts.length} conflicts`);

        // Insert into database
        if (generatedTimetable.length > 0) {
            // Insert in batches to avoid query size limits
            const batchSize = 100;
            for (let i = 0; i < generatedTimetable.length; i += batchSize) {
                const batch = generatedTimetable.slice(i, i + batchSize);
                const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?)').join(',');
                const values = batch.flatMap(tt => [
                    tt.school_id,
                    tt.t_id,
                    tt.s_id,
                    tt.sec_id,
                    tt.room_id,
                    tt.timeslot_id
                ]);
                
                await pool.execute(
                    `INSERT INTO timetable (school_id, t_id, s_id, sec_id, room_id, timeslot_id) VALUES ${placeholders}`,
                    values
                );
            }
            
            console.log(`Inserted ${generatedTimetable.length} timetable entries`);
        } else {
            console.log('No timetable entries to insert');
        }

        res.json({
            message: 'Timetable generated successfully',
            generated: generatedTimetable.length,
            conflicts: conflicts.length > 0 ? conflicts : undefined
        });
    } catch (error) {
        console.error('Generate timetable error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

// Delete timetable entries
const deleteTimetable = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const { sectionIds } = req.body;

        let query = 'DELETE FROM timetable WHERE school_id = ?';
        const params = [schoolId];

        if (sectionIds && Array.isArray(sectionIds) && sectionIds.length > 0) {
            query += ` AND sec_id IN (${sectionIds.map(() => '?').join(',')})`;
            params.push(...sectionIds);
        }

        const [result] = await pool.execute(query, params);

        res.json({ message: 'Timetable deleted successfully', deleted: result.affectedRows });
    } catch (error) {
        console.error('Delete timetable error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get statistics
const getStatistics = async (req, res) => {
    try {
        const { schoolId } = req.params;

        const [stats] = await pool.execute(`
            SELECT 
                (SELECT COUNT(*) FROM teachers WHERE school_id = ?) as teachers,
                (SELECT COUNT(*) FROM subjects WHERE school_id = ?) as subjects,
                (SELECT COUNT(*) FROM classes WHERE school_id = ?) as classes,
                (SELECT COUNT(*) FROM sections WHERE c_id IN (SELECT c_id FROM classes WHERE school_id = ?)) as sections,
                (SELECT COUNT(*) FROM classrooms WHERE school_id = ?) as classrooms,
                (SELECT COUNT(*) FROM timeslots WHERE school_id = ?) as timeslots
        `, [schoolId, schoolId, schoolId, schoolId, schoolId, schoolId]);

        res.json(stats[0]);
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getTimetable,
    generateTimetable,
    deleteTimetable,
    getStatistics
};

