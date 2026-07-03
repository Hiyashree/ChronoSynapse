/**
 * End-to-end verification for ChronoSynapse resume points:
 * 1. Class routine management + dynamic timetable generation
 * 2. SQL database design (classes, subjects, scheduling)
 * 3. Conflict-free timetable generation with constraints
 * 4. Backend CRUD for scheduling data
 */
const base = 'http://localhost:3000/api';

async function api(path, options = {}) {
    const res = await fetch(`${base}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) throw new Error(`${options.method || 'GET'} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
    return data;
}

function assert(cond, msg) {
    if (!cond) throw new Error(`FAIL: ${msg}`);
    console.log(`  ✓ ${msg}`);
}

async function main() {
    console.log('\n=== ChronoSynapse Feature Verification ===\n');

    // Health
    const health = await api('/test');
    assert(health.status === 'ok', 'Backend running and database connected');

    // 1 & 2: Create school (auto seeds SQL tables: subjects, teachers, classes, timeslots)
    const school = await api('/schools', {
        method: 'POST',
        body: JSON.stringify({ schoolName: `Demo School ${Date.now()}` })
    });
    const schoolId = school.school_id;
    assert(!!schoolId, `School created (id=${schoolId})`);

    const stats = await api(`/timetable/${schoolId}/stats`);
    assert(stats.teachers >= 3, `SQL: ${stats.teachers} teachers stored`);
    assert(stats.subjects >= 5, `SQL: ${stats.subjects} subjects stored`);
    assert(stats.classes >= 1, `SQL: ${stats.classes} classes stored`);
    assert(stats.sections >= 1, `SQL: ${stats.sections} sections stored`);
    assert(stats.classrooms >= 1, `SQL: ${stats.classrooms} classrooms stored`);
    assert(stats.timeslots >= 30, `SQL: ${stats.timeslots} time slots stored`);

    const classes = await api(`/classes/${schoolId}`);
    const sections = [];
    for (const cls of classes) {
        const secs = await api(`/sections/${cls.c_id}`);
        sections.push(...secs);
    }
    assert(sections.length > 0, `Class routine: ${sections.length} section(s) ready for scheduling`);
    const sectionIds = sections.map(s => s.sec_id);

    // 4: Backend CRUD — update a teacher
    const teachers = await api(`/teachers/${schoolId}`);
    const teacherId = teachers[0].t_id;
    const updatedName = 'Updated Teacher Demo';
    await api(`/teachers/${schoolId}/${teacherId}`, {
        method: 'PUT',
        body: JSON.stringify({
            t_name: updatedName,
            qualification: teachers[0].qualification,
            contactno: teachers[0].contactno,
            email: teachers[0].email,
            salary: teachers[0].salary,
            subjects: (teachers[0].subjects || []).map(s => s.s_id)
        })
    });
    const teachersAfter = await api(`/teachers/${schoolId}`);
    assert(teachersAfter.find(t => t.t_id === teacherId).t_name === updatedName, 'Backend update: teacher name saved');

    // 3: Dynamic conflict-free timetable generation
    const gen = await api(`/timetable/${schoolId}/generate`, {
        method: 'POST',
        body: JSON.stringify({ sectionIds })
    });
    assert(gen.generated > 0, `Timetable generated: ${gen.generated} entries`);
    assert(!gen.conflicts || gen.conflicts.length === 0, 'No scheduling conflicts reported');

    const timetable = await api(`/timetable/${schoolId}?sectionIds=${sectionIds.join(',')}`);
    assert(timetable.length === gen.generated, 'Backend retrieve: timetable entries match generated count');

    // Verify conflict-free constraints in DB results
    const teacherSlot = new Set();
    const roomSlot = new Set();
    const sectionSlot = new Set();
    for (const row of timetable) {
        const tk = `${row.t_id}_${row.timeslot_id}`;
        const rk = `${row.room_id}_${row.timeslot_id}`;
        const sk = `${row.sec_id}_${row.timeslot_id}`;
        assert(!teacherSlot.has(tk), `No teacher double-booking (teacher ${row.t_id}, slot ${row.timeslot_id})`);
        assert(!roomSlot.has(rk), `No room double-booking (room ${row.room_id}, slot ${row.timeslot_id})`);
        assert(!sectionSlot.has(sk), `No section double-booking (section ${row.sec_id}, slot ${row.timeslot_id})`);
        teacherSlot.add(tk);
        roomSlot.add(rk);
        sectionSlot.add(sk);
    }
    assert(true, `Conflict-free check passed for ${timetable.length} assignments`);

    // 4: Delete timetable (backend update)
    const del = await api(`/timetable/${schoolId}`, {
        method: 'DELETE',
        body: JSON.stringify({ sectionIds })
    });
    assert(del.deleted >= 0, `Backend delete: removed ${del.deleted} timetable entries`);

    console.log('\n=== All 4 resume points verified ===');
    console.log(`\nOpen the app: http://localhost:3000`);
    console.log(`Demo school id: ${schoolId}\n`);
}

main().catch(err => {
    console.error('\n❌', err.message);
    process.exit(1);
});
