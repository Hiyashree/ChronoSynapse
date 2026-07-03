// School Dashboard - Main functionality

let currentSchoolId = null;
let currentPage = 'timetable';
let teachers = [];
let subjects = [];
let classes = [];
let sections = [];
let classrooms = [];
let timeslots = [];
let timetable = [];
let lastStats = {};

const SETUP_CHECKS = [
    { key: 'teachers', label: 'Add teachers', icon: '👥', page: 'teachers', min: 1 },
    { key: 'subjects', label: 'Define subjects', icon: '📚', page: 'subjects', min: 1 },
    { key: 'classes', label: 'Create classes', icon: '🏫', page: 'classes', min: 1 },
    { key: 'sections', label: 'Add sections', icon: '📋', page: 'classes', min: 1 },
    { key: 'classrooms', label: 'Set up rooms', icon: '🏛️', page: 'classrooms', min: 1 },
    { key: 'timeslots', label: 'Configure timeslots', icon: '⏰', page: 'timeslots', min: 1 }
];

const SUBJECT_PALETTE = [
    { class: 'tt-accent-rose',    label: 'Rose' },
    { class: 'tt-accent-violet',  label: 'Violet' },
    { class: 'tt-accent-indigo',  label: 'Indigo' },
    { class: 'tt-accent-fuchsia', label: 'Fuchsia' },
    { class: 'tt-accent-plum',    label: 'Plum' },
    { class: 'tt-accent-mauve',   label: 'Mauve' },
    { class: 'tt-accent-lilac',   label: 'Lilac' },
    { class: 'tt-accent-blush',   label: 'Blush' }
];

// Initialize dashboard
async function initDashboard() {
    currentSchoolId = getPathParam();
    if (!currentSchoolId) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Load user info and setup user menu
    await loadUserInfo();

    // Load school name
    await loadSchoolInfo();

    // Setup navigation
    setupNavigation();

    // Setup user menu click outside handler
    setupUserMenu();

    // Load initial data
    await loadAllData();

    // Live clock
    initLiveClock();

    // Load timetable page by default
    showPage('timetable');
}

// Load user info
async function loadUserInfo() {
    try {
        const avatar = document.getElementById('userAvatar');
        const username = localStorage.getItem('username') || 'U';
        const initial = username.charAt(0).toUpperCase();
        if (avatar) {
            avatar.textContent = initial;
        }

        // Try to get user details from API
        try {
            const user = await apiRequest('/auth/me');
            if (user) {
                document.getElementById('userMenuName').textContent = user.username || username;
                document.getElementById('userMenuEmail').textContent = user.email || 'No email';
            }
        } catch (error) {
            // If API fails, use localStorage
            document.getElementById('userMenuName').textContent = username;
            document.getElementById('userMenuEmail').textContent = localStorage.getItem('email') || 'No email';
        }

        // Show current school in menu
        if (currentSchoolId) {
            try {
                const userId = getUserId() || localStorage.getItem('guestId');
                const school = await apiRequest(`/schools/${currentSchoolId}?userId=${userId}`);
                document.getElementById('currentSchoolName').textContent = school.school_name;
                document.getElementById('currentSchoolItem').style.display = 'block';
            } catch (error) {
                console.error('Error loading school for menu:', error);
            }
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

// Load school info
async function loadSchoolInfo() {
    try {
        const userId = getUserId() || localStorage.getItem('guestId');
        const school = await apiRequest(`/schools/${currentSchoolId}?userId=${userId}`);
        document.getElementById('schoolName').textContent = school.school_name;
    } catch (error) {
        console.error('Error loading school:', error);
    }
}

// Setup navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            showPage(page);
        });
    });
}

// Show page
function showPage(page) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => {
        p.style.display = 'none';
    });

    // Show selected page
    document.getElementById(`${page}Page`).style.display = 'block';

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    currentPage = page;

    // Load page-specific data
    switch (page) {
        case 'timetable':
            loadTimetablePage();
            break;
        case 'teachers':
            loadTeachers();
            break;
        case 'subjects':
            loadSubjects();
            break;
        case 'classes':
            loadClasses();
            break;
        case 'classrooms':
            loadClassrooms();
            break;
        case 'timeslots':
            loadTimeslots();
            break;
    }
}

// Load all data
async function loadAllData() {
    try {
        [teachers, subjects, classes, classrooms, timeslots] = await Promise.all([
            apiRequest(`/teachers/${currentSchoolId}`),
            apiRequest(`/subjects/${currentSchoolId}`),
            apiRequest(`/classes/${currentSchoolId}`),
            apiRequest(`/classrooms/${currentSchoolId}`),
            apiRequest(`/timeslots/${currentSchoolId}`)
        ]);

        // Load sections for each class
        for (const cls of classes) {
            cls.sections = await apiRequest(`/sections/${cls.c_id}`);
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showAlert('Failed to load data', 'error');
    }
}

// ========== TIMETABLE PAGE ==========

async function loadTimetablePage() {
    try {
        const stats = await apiRequest(`/timetable/${currentSchoolId}/stats`);
        lastStats = stats;
        displayStats(stats);
        refreshTimetableWidgets(stats);
    } catch (error) {
        console.error('Error loading stats:', error);
    }

    await loadClassesForTimetable();
    await loadTimetable();
}

function buildSubjectColorMap(subjectNames) {
    const sorted = [...subjectNames].sort((a, b) => a.localeCompare(b));
    const map = {};
    sorted.forEach((name, i) => {
        map[name] = SUBJECT_PALETTE[i % SUBJECT_PALETTE.length];
    });
    return map;
}

function getSubjectColor(subjectName, colorMap) {
    if (colorMap && colorMap[subjectName]) {
        return colorMap[subjectName];
    }
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
        hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length];
}

function getSetupProgress(stats) {
    const checks = SETUP_CHECKS.map(c => ({
        ...c,
        count: stats[c.key] || 0,
        done: (stats[c.key] || 0) >= c.min
    }));
    const doneCount = checks.filter(c => c.done).length;
    return {
        checks,
        percent: Math.round((doneCount / checks.length) * 100),
        ready: doneCount === checks.length
    };
}

function refreshTimetableWidgets(stats) {
    renderSetupReadiness(stats);
    renderTodaySchedule();
    renderTimetableInsights();
    renderQuickActions(stats);
}

function renderSetupReadiness(stats) {
    const el = document.getElementById('setupReadiness');
    if (!el) return;

    const { checks, percent, ready } = getSetupProgress(stats);
    const circumference = 2 * Math.PI * 36;
    const offset = circumference - (percent / 100) * circumference;

    el.innerHTML = `
        <div class="widget-header">
            <span class="widget-icon">🎯</span>
            <h3>Setup Readiness</h3>
        </div>
        <div class="readiness-body">
            <div class="readiness-ring">
                <svg viewBox="0 0 80 80">
                    <circle class="readiness-ring-bg" cx="40" cy="40" r="36"/>
                    <circle class="readiness-ring-fill" cx="40" cy="40" r="36"
                        stroke-dasharray="${circumference}"
                        stroke-dashoffset="${offset}"/>
                </svg>
                <span class="readiness-percent">${percent}%</span>
            </div>
            <div class="readiness-details">
                <p class="readiness-status ${ready ? 'ready' : 'pending'}">
                    ${ready ? '✓ Ready to generate!' : `${checks.filter(c => !c.done).length} step(s) remaining`}
                </p>
                <ul class="readiness-checklist">
                    ${checks.map(c => `
                        <li class="${c.done ? 'done' : 'pending'}" onclick="showPage('${c.page}')" title="Go to ${c.label}">
                            <span class="check-icon">${c.done ? '✓' : c.icon}</span>
                            <span>${c.label}</span>
                            <span class="check-count">${c.count}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
}

function renderTodaySchedule() {
    const el = document.getElementById('todaySchedule');
    if (!el) return;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const todayEntries = timetable
        .filter(e => e.day === today)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));

    let content = '';
    if (todayEntries.length === 0) {
        content = `
            <p class="widget-empty">${timetable.length === 0 ? 'Generate a timetable to see today\'s schedule.' : `No classes scheduled for ${today}.`}</p>
        `;
    } else {
        const upcoming = todayEntries.find(e => {
            const [h, m] = e.end_time.split(':').map(Number);
            return h * 60 + m > nowMinutes;
        });

        content = `
            <div class="today-highlight ${upcoming ? 'active' : 'done'}">
                ${upcoming
                    ? `<span class="today-now">Up next</span>
                       <strong>${formatTime(upcoming.start_time)} – ${upcoming.s_name}</strong>
                       <small>${upcoming.t_name} · Room ${upcoming.room_no} · Class ${upcoming.c_name}-${upcoming.sec_name}</small>`
                    : `<span class="today-now">All done!</span>
                       <strong>No more classes today</strong>
                       <small>${todayEntries.length} period(s) completed</small>`
                }
            </div>
            <ul class="today-list">
                ${todayEntries.slice(0, 5).map(e => {
                    const [eh, em] = e.end_time.split(':').map(Number);
                    const past = eh * 60 + em <= nowMinutes;
                    return `
                        <li class="${past ? 'past' : ''}">
                            <span class="today-time">${formatTime(e.start_time)}</span>
                            <span class="today-subject">${e.s_name}</span>
                            <span class="today-room">${e.room_no}</span>
                        </li>
                    `;
                }).join('')}
            </ul>
            ${todayEntries.length > 5 ? `<p class="widget-more">+${todayEntries.length - 5} more periods</p>` : ''}
        `;
    }

    el.innerHTML = `
        <div class="widget-header">
            <span class="widget-icon">📆</span>
            <h3>Today · ${today}</h3>
        </div>
        ${content}
    `;
}

function renderTimetableInsights() {
    const el = document.getElementById('timetableInsights');
    if (!el) return;

    const lastGen = localStorage.getItem(`lastGenerated_${currentSchoolId}`);
    const sections = new Set(timetable.map(e => `${e.c_name}-${e.sec_name}`)).size;
    const subjectsUsed = new Set(timetable.map(e => e.s_name)).size;
    const teachersUsed = new Set(timetable.map(e => e.t_name)).size;
    const totalSlots = timeslots.length * 5;
    const fillRate = totalSlots > 0 ? Math.min(100, Math.round((timetable.length / totalSlots) * 100)) : 0;

    el.innerHTML = `
        <div class="widget-header">
            <span class="widget-icon">📊</span>
            <h3>Timetable Insights</h3>
        </div>
        <div class="insights-grid">
            <div class="insight-item">
                <span class="insight-value">${timetable.length}</span>
                <span class="insight-label">Entries</span>
            </div>
            <div class="insight-item">
                <span class="insight-value">${sections}</span>
                <span class="insight-label">Sections</span>
            </div>
            <div class="insight-item">
                <span class="insight-value">${subjectsUsed}</span>
                <span class="insight-label">Subjects</span>
            </div>
            <div class="insight-item">
                <span class="insight-value">${teachersUsed}</span>
                <span class="insight-label">Teachers</span>
            </div>
        </div>
        <div class="insight-fill">
            <div class="insight-fill-header">
                <span>Schedule coverage</span>
                <span>${fillRate}%</span>
            </div>
            <div class="insight-fill-bar">
                <div class="insight-fill-progress" style="width: ${fillRate}%"></div>
            </div>
        </div>
        ${lastGen ? `<p class="insight-meta">Last generated: ${formatDate(lastGen)}</p>` : '<p class="insight-meta">Not generated yet</p>'}
    `;
}

function renderQuickActions(stats) {
    const el = document.getElementById('quickActions');
    if (!el) return;

    const { ready } = getSetupProgress(stats);

    el.innerHTML = `
        <div class="widget-header">
            <span class="widget-icon">⚡</span>
            <h3>Quick Actions</h3>
        </div>
        <div class="quick-actions-grid">
            <button class="quick-action-btn" onclick="quickGenerateAll()" ${!ready ? 'title="Complete setup first"' : ''}>
                <span>⚡</span> Generate All
            </button>
            <button class="quick-action-btn" onclick="showPage('teachers'); setTimeout(openTeacherModal, 200)">
                <span>👥</span> Add Teacher
            </button>
            <button class="quick-action-btn" onclick="showPage('timeslots')">
                <span>⏰</span> Timeslots
            </button>
            <button class="quick-action-btn" onclick="downloadTimetable()">
                <span>📥</span> Export CSV
            </button>
            <button class="quick-action-btn" onclick="printTimetable()">
                <span>🖨️</span> Print View
            </button>
            <button class="quick-action-btn" onclick="showAllSections()">
                <span>👁️</span> View All
            </button>
        </div>
        ${!ready ? '<p class="widget-tip">💡 Complete the setup checklist before generating.</p>' : ''}
    `;
}

function quickGenerateAll() {
    const select = document.getElementById('classSelect');
    if (select) {
        select.value = 'all';
        generateTimetable();
    }
}

function initLiveClock() {
    const update = () => {
        const now = new Date();
        const timeEl = document.getElementById('liveClockTime');
        const dateEl = document.getElementById('liveClockDate');
        const dayEl = document.getElementById('liveClockDay');
        if (!timeEl) return;

        timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
        dayEl.textContent = now.toLocaleDateString([], { year: 'numeric' });
    };
    update();
    setInterval(update, 1000);
}

function printTimetable() {
    if (timetable.length === 0) {
        showAlert('Generate a timetable first to print', 'error');
        return;
    }
    document.body.classList.add('printing-timetable');
    window.print();
    setTimeout(() => document.body.classList.remove('printing-timetable'), 500);
}

async function clearTimetable() {
    if (timetable.length === 0) {
        showAlert('No timetable to clear', 'error');
        return;
    }
    if (!confirm('Remove all generated timetable entries for this school?')) return;

    try {
        await apiRequest(`/timetable/${currentSchoolId}`, { method: 'DELETE' });
        timetable = [];
        localStorage.removeItem(`lastGenerated_${currentSchoolId}`);
        displayTimetable();
        renderTodaySchedule();
        renderTimetableInsights();
        showAlert('Timetable cleared successfully', 'success');
    } catch (error) {
        showAlert(error.message || 'Failed to clear timetable', 'error');
    }
}

function displayStats(stats) {
    const grid = document.getElementById('statsGrid');
    if (!grid) return;
    grid.style.display = 'none';
    grid.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${stats.teachers || 0}</div>
            <div class="stat-label">👥 Teachers</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.subjects || 0}</div>
            <div class="stat-label">📚 Subjects</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.classes || 0}</div>
            <div class="stat-label">🏫 Classes</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.sections || 0}</div>
            <div class="stat-label">📋 Sections</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.classrooms || 0}</div>
            <div class="stat-label">🏛️ Classrooms</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.timeslots || 0}</div>
            <div class="stat-label">⏰ Timeslots</div>
        </div>
    `;
}

async function loadClassesForTimetable() {
    const select = document.getElementById('classSelect');
    if (!select) return;
    
    // Remove existing event listeners by cloning (preserve attributes)
    const oldSelect = select.cloneNode(false);
    // Copy all attributes
    Array.from(select.attributes).forEach(attr => {
        oldSelect.setAttribute(attr.name, attr.value);
    });
    oldSelect.innerHTML = '<option value="">Select classes...</option>';

    // Add option to generate for all classes
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All Classes';
    oldSelect.appendChild(allOption);

    // Add only classes (will generate for all sections of that class)
    for (const cls of classes) {
        const classOption = document.createElement('option');
        classOption.value = `class_${cls.c_id}`;
        classOption.textContent = `Class ${cls.c_name}`;
        oldSelect.appendChild(classOption);
    }

    // Replace the select element to remove old listeners
    select.parentNode.replaceChild(oldSelect, select);
    
    // Attach new change event listener
    document.getElementById('classSelect').addEventListener('change', () => {
        loadTimetable();
    });
}

async function loadTimetable() {
    try {
        // Load all timetable entries for the school
        let url = `/timetable/${currentSchoolId}`;
        
        // Get selected value from dropdown
        const select = document.getElementById('classSelect');
        const selectedValue = select ? select.value : '';

        if (selectedValue && selectedValue !== '') {
            // Convert selection to section IDs
            let sectionIds = [];
            
            if (selectedValue === 'all') {
                for (const cls of classes) {
                    for (const section of cls.sections || []) {
                        sectionIds.push(section.sec_id);
                    }
                }
            } else if (selectedValue.startsWith('class_')) {
                const classId = parseInt(selectedValue.replace('class_', ''));
                const cls = classes.find(c => c.c_id === classId);
                if (cls) {
                    for (const section of cls.sections || []) {
                        sectionIds.push(section.sec_id);
                    }
                }
            }
            
            if (sectionIds.length > 0) {
                url += `?sectionIds=${sectionIds.join(',')}`;
            }
        }

        console.log('Loading timetable from:', url);
        timetable = await apiRequest(url);
        console.log('Loaded timetable entries:', timetable.length);
        displayTimetable();
    } catch (error) {
        console.error('Error loading timetable:', error);
        showAlert('Failed to load timetable: ' + error.message, 'error');
    }
}

function displayTimetable() {
    const container = document.getElementById('timetableContainer');

    renderTodaySchedule();
    renderTimetableInsights();

    if (timetable.length === 0) {
        container.innerHTML = `
            <div class="empty-state empty-state-rich">
                <div class="empty-state-icon">📅</div>
                <h3>No Timetable Yet</h3>
                <p>Select a class and hit <strong>Generate</strong>, or use the quick action below.</p>
                <button class="btn btn-primary" onclick="quickGenerateAll()" style="margin-top: 1rem;">⚡ Generate for All Classes</button>
            </div>
        `;
        return;
    }

    // Get all unique days and timeslots
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeslotsMap = {};
    timetable.forEach(entry => {
        const key = `${entry.start_time}-${entry.end_time}`;
        if (!timeslotsMap[key]) {
            timeslotsMap[key] = { start: entry.start_time, end: entry.end_time };
        }
    });
    
    // Also add lunch break timeslot if it exists
    // Check if we have a 12:00-13:00 timeslot from the global timeslots array
    if (timeslots && timeslots.length > 0) {
        const hasLunch = timeslots.some(ts => 
            (ts.start_time === '12:00:00' || ts.start_time.startsWith('12:')) &&
            (ts.end_time === '13:00:00' || ts.end_time.startsWith('13:'))
        );
        
        if (hasLunch) {
            timeslotsMap['12:00:00-13:00:00'] = { start: '12:00:00', end: '13:00:00' };
        }
    }
    
    const timeSlots = Object.values(timeslotsMap).sort((a, b) => 
        a.start.localeCompare(b.start)
    );

    // Group by section
    const bySection = {};
    timetable.forEach(entry => {
        const key = `${entry.c_name}-${entry.sec_name}`;
        if (!bySection[key]) {
            bySection[key] = {
                className: entry.c_name,
                sectionName: entry.sec_name,
                sectionKey: key,
                entries: []
            };
        }
        bySection[key].entries.push(entry);
    });

    const sections = Object.values(bySection);
    const subjectColorMap = buildSubjectColorMap([...new Set(timetable.map(e => e.s_name))]);
    const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
    
    // Create section buttons
    let sectionButtonsHTML = '';
    let firstSectionKey = null;
    if (sections.length > 1) {
        firstSectionKey = sections[0].sectionKey;
        sectionButtonsHTML = `
            <div style="margin-bottom: 2rem; display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
                <button class="btn btn-secondary" onclick="showAllSections()" id="showAllBtn" style="background: var(--input-bg); color: var(--text-primary);">
                    Show All Sections
                </button>
                ${sections.map(({ sectionKey, className, sectionName }, index) => `
                    <button class="btn btn-secondary section-toggle-btn" 
                            onclick="showSection('${sectionKey}')" 
                            data-section="${sectionKey}"
                            style="background: ${index === 0 ? 'var(--primary-purple)' : 'var(--input-bg)'}; color: ${index === 0 ? 'white' : 'var(--text-primary)'};">
                        Class ${className} - Section ${sectionName}
                    </button>
                `).join('')}
            </div>
        `;
    }

    // Generate HTML for each section
    const sectionsHTML = sections.map(({ className, sectionName, sectionKey, entries }) => {
        // Create a grid: rows = timeslots, cols = days
        const grid = {};
        entries.forEach(entry => {
            const timeKey = `${entry.start_time}-${entry.end_time}`;
            if (!grid[timeKey]) {
                grid[timeKey] = {};
            }
            grid[timeKey][entry.day] = entry;
        });

        return `
            <div class="card section-timetable" data-section="${sectionKey}" style="margin-bottom: 2rem;">
                <h3 class="tt-section-title">Timetable for Class ${className} — Section ${sectionName}</h3>
                <div class="table-container tt-table-wrap">
                    <table class="tt-table">
                        <thead>
                            <tr>
                                <th class="tt-col-time">Time</th>
                                ${days.map(day => `
                                    <th class="${day === todayName ? 'tt-col-today' : ''}">${day}</th>
                                `).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${timeSlots.map((ts) => {
                                const timeKey = `${ts.start}-${ts.end}`;
                                const isLunch = (ts.start === '12:00:00' || ts.start.startsWith('12:')) && 
                                               (ts.end === '13:00:00' || ts.end.startsWith('13:'));
                                
                                return `
                                    <tr>
                                        <td class="tt-time">${formatTime(ts.start)} – ${formatTime(ts.end)}</td>
                                        ${isLunch ? `
                                            <td colspan="${days.length}" class="tt-lunch">🍽️ Lunch Break</td>
                                        ` : days.map(day => {
                                            const entry = grid[timeKey]?.[day];
                                            const isToday = day === todayName;
                                            if (entry) {
                                                const color = getSubjectColor(entry.s_name, subjectColorMap);
                                                return `
                                                    <td class="tt-cell ${color.class}${isToday ? ' tt-cell-today' : ''}">
                                                        <div class="tt-cell-subject">${entry.s_name}</div>
                                                        <div class="tt-cell-teacher">${entry.t_name}</div>
                                                        <div class="tt-cell-room">Room ${entry.room_no}</div>
                                                    </td>
                                                `;
                                            }
                                            return `<td class="tt-empty${isToday ? ' tt-cell-today' : ''}">—</td>`;
                                        }).join('')}
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }).join('');

    // Subject color legend
    const uniqueSubjects = [...new Set(timetable.map(e => e.s_name))];
    const legendHTML = uniqueSubjects.length > 0 ? `
        <div class="subject-legend card">
            <h4 class="subject-legend-title">Subject Legend</h4>
            <div class="subject-legend-items">
                ${uniqueSubjects.sort().map(name => {
                    const c = getSubjectColor(name, subjectColorMap);
                    return `<span class="subject-legend-item"><i class="${c.class}"></i>${name}</span>`;
                }).join('')}
            </div>
        </div>
    ` : '';

    container.innerHTML = sectionButtonsHTML + sectionsHTML + legendHTML;
    
    // If multiple sections, show only the first one initially
    if (sections.length > 1 && firstSectionKey) {
        showSection(firstSectionKey);
    }
}

// Function to show a specific section
function showSection(sectionKey) {
    // Hide all sections
    document.querySelectorAll('.section-timetable').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    const selectedSection = document.querySelector(`.section-timetable[data-section="${sectionKey}"]`);
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }
    
    // Update button styles
    document.querySelectorAll('.section-toggle-btn').forEach(btn => {
        btn.style.background = 'var(--input-bg)';
        btn.style.color = 'var(--text-primary)';
    });
    
    const selectedBtn = document.querySelector(`.section-toggle-btn[data-section="${sectionKey}"]`);
    if (selectedBtn) {
        selectedBtn.style.background = 'var(--primary-purple)';
        selectedBtn.style.color = 'white';
    }
    
    // Update "Show All" button
    const showAllBtn = document.getElementById('showAllBtn');
    if (showAllBtn) {
        showAllBtn.style.background = 'var(--input-bg)';
        showAllBtn.style.color = 'var(--text-primary)';
    }
}

// Function to show all sections
function showAllSections() {
    const sections = document.querySelectorAll('.section-timetable');
    if (sections.length === 0) {
        showAlert('Generate a timetable first to view sections', 'error');
        return;
    }

    // Show all sections
    sections.forEach(section => {
        section.style.display = 'block';
    });
    
    // Update button styles
    document.querySelectorAll('.section-toggle-btn').forEach(btn => {
        btn.style.background = 'var(--input-bg)';
        btn.style.color = 'var(--text-primary)';
    });
    
    // Update "Show All" button
    const showAllBtn = document.getElementById('showAllBtn');
    if (showAllBtn) {
        showAllBtn.style.background = 'var(--primary-purple)';
        showAllBtn.style.color = 'white';
    }
}

async function generateTimetable() {
    const select = document.getElementById('classSelect');
    const selectedValue = select.value;

    if (!selectedValue || selectedValue === '') {
        showAlert('Please select a class or section', 'error');
        return;
    }

    // Process selection: convert to section IDs
    let sectionIds = [];
    
    if (selectedValue === 'all') {
        // Get all sections from all classes
        for (const cls of classes) {
            for (const section of cls.sections || []) {
                sectionIds.push(section.sec_id);
            }
        }
    } else if (selectedValue.startsWith('class_')) {
        // Get all sections for this class
        const classId = parseInt(selectedValue.replace('class_', ''));
        const cls = classes.find(c => c.c_id === classId);
        if (cls) {
            for (const section of cls.sections || []) {
                sectionIds.push(section.sec_id);
            }
        }
    } else if (selectedValue.startsWith('sec_')) {
        // Individual section
        const secId = parseInt(selectedValue.replace('sec_', ''));
        sectionIds.push(secId);
    }

    if (sectionIds.length === 0) {
        showAlert('No sections found to generate timetable for', 'error');
        return;
    }

    try {
        const container = document.getElementById('timetableContainer');
        container.innerHTML = '<div class="spinner"></div><p style="text-align: center; margin-top: 1rem;">Generating timetable... Please wait.</p>';
        
        console.log('Generating timetable for sections:', sectionIds);
        const result = await apiRequest(`/timetable/${currentSchoolId}/generate`, {
            method: 'POST',
            body: JSON.stringify({ sectionIds })
        });

        console.log('Generation result:', result);
        
        if (result.generated > 0) {
            localStorage.setItem(`lastGenerated_${currentSchoolId}`, new Date().toISOString());
            showAlert(`Timetable generated successfully! ${result.generated} entries created.`, 'success');
        } else {
            showAlert('Timetable generation completed but no entries were created. Check if teachers, subjects, and timeslots are properly configured.', 'error');
        }
        
        if (result.conflicts && result.conflicts.length > 0) {
            console.warn('Conflicts:', result.conflicts);
            showAlert(`Warning: ${result.conflicts.length} timeslots could not be assigned.`, 'error');
        }

        // Reload data and timetable
        await loadAllData();
        await loadTimetable();
        if (lastStats) refreshTimetableWidgets(lastStats);
    } catch (error) {
        console.error('Generate timetable error:', error);
        showAlert(error.message || 'Failed to generate timetable. Check console for details.', 'error');
        await loadTimetable();
    }
}

function downloadTimetable() {
    if (timetable.length === 0) {
        showAlert('No timetable to download', 'error');
        return;
    }

    // Create CSV data with all entries
    const csvData = [];
    
    // Group by section and day for better organization
    const bySection = {};
    timetable.forEach(entry => {
        const key = `${entry.c_name}-${entry.sec_name}`;
        if (!bySection[key]) {
            bySection[key] = {
                className: entry.c_name,
                sectionName: entry.sec_name,
                entries: []
            };
        }
        bySection[key].entries.push(entry);
    });

    // Add header
    csvData.push({
        'Class': 'Class',
        'Section': 'Section',
        'Day': 'Day',
        'Time': 'Time',
        'Subject': 'Subject',
        'Subject Code': 'Subject Code',
        'Teacher': 'Teacher',
        'Classroom': 'Classroom'
    });

    // Add data rows
    Object.values(bySection).forEach(({ className, sectionName, entries }) => {
        entries.sort((a, b) => {
            const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
            if (dayDiff !== 0) return dayDiff;
            return a.start_time.localeCompare(b.start_time);
        }).forEach(entry => {
            csvData.push({
                'Class': className,
                'Section': sectionName,
                'Day': entry.day,
                'Time': `${formatTime(entry.start_time)} - ${formatTime(entry.end_time)}`,
                'Subject': entry.s_name,
                'Subject Code': entry.s_code || '',
                'Teacher': entry.t_name,
                'Classroom': entry.room_no
            });
        });
    });

    exportToCSV(csvData, `timetable_${currentSchoolId}_${new Date().toISOString().split('T')[0]}.csv`);
}

// ========== TEACHERS PAGE ==========

async function loadTeachers() {
    try {
        teachers = await apiRequest(`/teachers/${currentSchoolId}`);
        displayTeachers();
    } catch (error) {
        console.error('Error loading teachers:', error);
        showAlert('Failed to load teachers', 'error');
    }
}

function displayTeachers() {
    const tbody = document.getElementById('teachersTableBody');
    if (teachers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No teachers found</td></tr>';
        return;
    }

    tbody.innerHTML = teachers.map(teacher => {
        const subjectsList = (teacher.subjects || []).map(s => 
            `<span class="tag">${s.s_name}</span>`
        ).join('') || '<span class="tag">N/A</span>';

        return `
            <tr>
                <td>${teacher.t_name}</td>
                <td>${teacher.qualification || '-'}</td>
                <td>${subjectsList}</td>
                <td>${teacher.contactno || '-'}</td>
                <td>${teacher.email || '-'}</td>
                <td>${formatCurrency(teacher.salary || 0)}</td>
                <td>
                    <span class="action-icon edit" onclick="openTeacherModal(${teacher.t_id})">✏️</span>
                    <span class="action-icon delete" onclick="deleteTeacher(${teacher.t_id})">🗑️</span>
                </td>
            </tr>
        `;
    }).join('');
}

let currentTeacherId = null;

function openTeacherModal(teacherId = null) {
    currentTeacherId = teacherId;
    const modal = document.getElementById('teacherModal');
    const form = document.getElementById('teacherForm');
    const title = document.getElementById('teacherModalTitle');

    title.textContent = teacherId ? 'Edit Teacher' : 'Add New Teacher';
    form.reset();

    // Populate subjects checkbox
    const subjectsCheckbox = document.getElementById('teacherSubjectsCheckbox');
    subjectsCheckbox.innerHTML = subjects.map(s => `
        <div class="checkbox-item">
            <input type="checkbox" id="subj_${s.s_id}" value="${s.s_id}" name="subjects">
            <label for="subj_${s.s_id}">${s.s_name}</label>
        </div>
    `).join('');

    // Populate timeslots checkbox
    const timeslotsCheckbox = document.getElementById('teacherUnavailabilityCheckbox');
    timeslotsCheckbox.innerHTML = timeslots.map(t => `
        <div class="checkbox-item">
            <input type="checkbox" id="unav_${t.timeslot_id}" value="${t.timeslot_id}" name="unavailability">
            <label for="unav_${t.timeslot_id}">${t.day}, ${formatTime(t.start_time)} - ${formatTime(t.end_time)}</label>
        </div>
    `).join('');

    if (teacherId) {
        const teacher = teachers.find(t => t.t_id === teacherId);
        if (teacher) {
            form.t_name.value = teacher.t_name;
            form.qualification.value = teacher.qualification || '';
            form.contactno.value = teacher.contactno || '';
            form.email.value = teacher.email || '';
            form.salary.value = teacher.salary || 0;

            // Check subjects
            (teacher.subjects || []).forEach(s => {
                const checkbox = document.getElementById(`subj_${s.s_id}`);
                if (checkbox) checkbox.checked = true;
            });

            // Check unavailability
            (teacher.unavailability || []).forEach(u => {
                const checkbox = document.getElementById(`unav_${u.timeslot_id}`);
                if (checkbox) checkbox.checked = true;
            });
        }
    }

    modal.classList.add('active');
}

function closeTeacherModal() {
    document.getElementById('teacherModal').classList.remove('active');
    currentTeacherId = null;
}

document.getElementById('teacherForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
        t_name: formData.get('t_name'),
        qualification: formData.get('qualification'),
        contactno: formData.get('contactno'),
        email: formData.get('email'),
        salary: parseFloat(formData.get('salary')) || 0,
        subjects: Array.from(formData.getAll('subjects')).map(Number),
        unavailability: Array.from(formData.getAll('unavailability')).map(Number)
    };

    try {
        if (currentTeacherId) {
            await apiRequest(`/teachers/${currentSchoolId}/${currentTeacherId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showAlert('Teacher updated successfully', 'success');
        } else {
            await apiRequest(`/teachers/${currentSchoolId}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showAlert('Teacher added successfully', 'success');
        }

        closeTeacherModal();
        await loadTeachers();
        await loadAllData();
    } catch (error) {
        showAlert(error.message, 'error');
    }
});

async function deleteTeacher(teacherId) {
    if (!confirm('Are you sure you want to delete this teacher?')) return;

    try {
        await apiRequest(`/teachers/${currentSchoolId}/${teacherId}`, {
            method: 'DELETE'
        });
        showAlert('Teacher deleted successfully', 'success');
        await loadTeachers();
        await loadAllData();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// ========== SUBJECTS PAGE ==========

async function loadSubjects() {
    try {
        subjects = await apiRequest(`/subjects/${currentSchoolId}`);
        displaySubjects();
    } catch (error) {
        console.error('Error loading subjects:', error);
        showAlert('Failed to load subjects', 'error');
    }
}

function displaySubjects() {
    const tbody = document.getElementById('subjectsTableBody');
    if (subjects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem;">No subjects found</td></tr>';
        return;
    }

    tbody.innerHTML = subjects.map(subject => `
        <tr>
            <td>${subject.s_name}</td>
            <td>${subject.s_code || '-'}</td>
            <td>
                <span class="action-icon edit" onclick="openSubjectModal(${subject.s_id})">✏️</span>
                <span class="action-icon delete" onclick="deleteSubject(${subject.s_id})">🗑️</span>
            </td>
        </tr>
    `).join('');
}

let currentSubjectId = null;

function openSubjectModal(subjectId = null) {
    currentSubjectId = subjectId;
    const modal = document.getElementById('subjectModal');
    const form = document.getElementById('subjectForm');
    const title = document.getElementById('subjectModalTitle');

    title.textContent = subjectId ? 'Edit Subject' : 'Add New Subject';
    form.reset();

    if (subjectId) {
        const subject = subjects.find(s => s.s_id === subjectId);
        if (subject) {
            form.s_name.value = subject.s_name;
            form.s_code.value = subject.s_code || '';
        }
    }

    modal.classList.add('active');
}

function closeSubjectModal() {
    document.getElementById('subjectModal').classList.remove('active');
    currentSubjectId = null;
}

document.getElementById('subjectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
        s_name: formData.get('s_name'),
        s_code: formData.get('s_code')
    };

    try {
        if (currentSubjectId) {
            await apiRequest(`/subjects/${currentSchoolId}/${currentSubjectId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showAlert('Subject updated successfully', 'success');
        } else {
            await apiRequest(`/subjects/${currentSchoolId}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showAlert('Subject added successfully', 'success');
        }

        closeSubjectModal();
        await loadSubjects();
        await loadAllData();
    } catch (error) {
        showAlert(error.message, 'error');
    }
});

async function deleteSubject(subjectId) {
    if (!confirm('Are you sure you want to delete this subject?')) return;

    try {
        await apiRequest(`/subjects/${currentSchoolId}/${subjectId}`, {
            method: 'DELETE'
        });
        showAlert('Subject deleted successfully', 'success');
        await loadSubjects();
        await loadAllData();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// ========== CLASSES PAGE ==========

async function loadClasses() {
    try {
        classes = await apiRequest(`/classes/${currentSchoolId}`);
        for (const cls of classes) {
            cls.sections = await apiRequest(`/sections/${cls.c_id}`);
        }
        displayClasses();
    } catch (error) {
        console.error('Error loading classes:', error);
        showAlert('Failed to load classes', 'error');
    }
}

function displayClasses() {
    const container = document.getElementById('classesContainer');
    if (classes.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No classes found</p></div>';
        return;
    }

    container.innerHTML = classes.map(cls => {
        const subjectsList = (cls.subjects || []).map(s => 
            `<span class="tag">${s.s_name}</span>`
        ).join('') || '<span class="tag">Unknown Subject</span>';

        return `
            <div class="card" style="margin-bottom: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.5rem;">
                    <div>
                        <h3 style="font-size: 2rem; margin-bottom: 0.5rem;">${cls.c_name}</h3>
                        <p style="color: var(--text-gray);">
                            Class Teacher: ${cls.class_teacher_name || 'Not assigned'} | 
                            ${cls.sections?.length || 0} Sections
                        </p>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-secondary" onclick="openClassModal(${cls.c_id})">✏️ Edit Class Details</button>
                        <button class="btn btn-danger" onclick="deleteClass(${cls.c_id})">🗑️ Delete Class</button>
                    </div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="margin-bottom: 0.5rem;">Allowed Subjects for ${cls.c_name}</h4>
                    <div>${subjectsList}</div>
                </div>

                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h4>Sections for ${cls.c_name}</h4>
                        <button class="btn btn-primary" onclick="openSectionModal(${cls.c_id})">➕ Add Section</button>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Section Name</th>
                                    <th>Strength</th>
                                    <th>Allowed Timeslots</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(cls.sections || []).map(sec => `
                                    <tr>
                                        <td>${sec.sec_name}</td>
                                        <td>${sec.strength || 0}</td>
                                        <td>${sec.allowedTimeslots?.length || 'All'}</td>
                                        <td>
                                            <span class="action-icon edit" onclick="openSectionModal(${cls.c_id}, ${sec.sec_id})">✏️</span>
                                            <span class="action-icon delete" onclick="deleteSection(${cls.c_id}, ${sec.sec_id})">🗑️</span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

let currentClassId = null;

function openClassModal(classId = null) {
    currentClassId = classId;
    const modal = document.getElementById('classModal');
    const form = document.getElementById('classForm');
    const title = document.getElementById('classModalTitle');

    title.textContent = classId ? 'Edit Class' : 'Add New Class';
    form.reset();

    // Populate teachers dropdown
    const teacherSelect = document.getElementById('classTeacherSelect');
    teacherSelect.innerHTML = '<option value="">Select a teacher...</option>';
    teachers.forEach(t => {
        const option = document.createElement('option');
        option.value = t.t_id;
        option.textContent = t.t_name;
        teacherSelect.appendChild(option);
    });

    // Populate subjects checkbox
    const subjectsCheckbox = document.getElementById('classSubjectsCheckbox');
    subjectsCheckbox.innerHTML = subjects.map(s => `
        <div class="checkbox-item">
            <input type="checkbox" id="class_subj_${s.s_id}" value="${s.s_id}" name="subjects">
            <label for="class_subj_${s.s_id}">${s.s_name}</label>
        </div>
    `).join('');

    if (classId) {
        const cls = classes.find(c => c.c_id === classId);
        if (cls) {
            form.c_name.value = cls.c_name;
            form.t_id.value = cls.t_id || '';
            (cls.subjects || []).forEach(s => {
                const checkbox = document.getElementById(`class_subj_${s.s_id}`);
                if (checkbox) checkbox.checked = true;
            });
        }
    }

    modal.classList.add('active');
}

function closeClassModal() {
    document.getElementById('classModal').classList.remove('active');
    currentClassId = null;
}

document.getElementById('classForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
        c_name: formData.get('c_name'),
        t_id: formData.get('t_id') || null,
        subjects: Array.from(formData.getAll('subjects')).map(Number)
    };

    try {
        if (currentClassId) {
            await apiRequest(`/classes/${currentSchoolId}/${currentClassId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showAlert('Class updated successfully', 'success');
        } else {
            await apiRequest(`/classes/${currentSchoolId}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showAlert('Class added successfully', 'success');
        }

        closeClassModal();
        await loadClasses();
        await loadAllData();
    } catch (error) {
        showAlert(error.message, 'error');
    }
});

async function deleteClass(classId) {
    if (!confirm('Are you sure you want to delete this class? This will delete all sections.')) return;

    try {
        await apiRequest(`/classes/${currentSchoolId}/${classId}`, {
            method: 'DELETE'
        });
        showAlert('Class deleted successfully', 'success');
        await loadClasses();
        await loadAllData();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// ========== SECTIONS ==========

let currentSectionClassId = null;
let currentSectionId = null;

function openSectionModal(classId, sectionId = null) {
    currentSectionClassId = classId;
    currentSectionId = sectionId;
    const modal = document.getElementById('sectionModal');
    const form = document.getElementById('sectionForm');
    const title = document.getElementById('sectionModalTitle');

    title.textContent = sectionId ? 'Edit Section' : 'Add New Section';
    form.reset();

    // Populate timeslots checkbox
    const timeslotsCheckbox = document.getElementById('sectionTimeslotsCheckbox');
    timeslotsCheckbox.innerHTML = timeslots.map(t => `
        <div class="checkbox-item">
            <input type="checkbox" id="sec_timeslot_${t.timeslot_id}" value="${t.timeslot_id}" name="allowedTimeslots">
            <label for="sec_timeslot_${t.timeslot_id}">${t.day}, ${formatTime(t.start_time)} - ${formatTime(t.end_time)}</label>
        </div>
    `).join('');

    if (sectionId) {
        const cls = classes.find(c => c.c_id === classId);
        const section = cls?.sections?.find(s => s.sec_id === sectionId);
        if (section) {
            form.sec_name.value = section.sec_name;
            form.strength.value = section.strength || 0;
            (section.allowedTimeslots || []).forEach(t => {
                const checkbox = document.getElementById(`sec_timeslot_${t.timeslot_id}`);
                if (checkbox) checkbox.checked = true;
            });
        }
    }

    modal.classList.add('active');
}

function closeSectionModal() {
    document.getElementById('sectionModal').classList.remove('active');
    currentSectionClassId = null;
    currentSectionId = null;
}

document.getElementById('sectionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
        sec_name: formData.get('sec_name'),
        strength: parseInt(formData.get('strength')) || 0,
        allowedTimeslots: Array.from(formData.getAll('allowedTimeslots')).map(Number)
    };

    try {
        if (currentSectionId) {
            await apiRequest(`/sections/${currentSectionClassId}/${currentSectionId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showAlert('Section updated successfully', 'success');
        } else {
            await apiRequest(`/sections/${currentSectionClassId}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showAlert('Section added successfully', 'success');
        }

        closeSectionModal();
        await loadClasses();
        await loadAllData();
    } catch (error) {
        showAlert(error.message, 'error');
    }
});

async function deleteSection(classId, sectionId) {
    if (!confirm('Are you sure you want to delete this section?')) return;

    try {
        await apiRequest(`/sections/${classId}/${sectionId}`, {
            method: 'DELETE'
        });
        showAlert('Section deleted successfully', 'success');
        await loadClasses();
        await loadAllData();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// ========== CLASSROOMS PAGE ==========

async function loadClassrooms() {
    try {
        classrooms = await apiRequest(`/classrooms/${currentSchoolId}`);
        displayClassrooms();
    } catch (error) {
        console.error('Error loading classrooms:', error);
        showAlert('Failed to load classrooms', 'error');
    }
}

function displayClassrooms() {
    const tbody = document.getElementById('classroomsTableBody');
    if (classrooms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No classrooms found</td></tr>';
        return;
    }

    tbody.innerHTML = classrooms.map(room => `
        <tr>
            <td>${room.room_no}</td>
            <td>${room.capacity || '-'}</td>
            <td>${room.type || '-'}</td>
            <td>
                <span class="action-icon edit" onclick="openClassroomModal(${room.room_id})">✏️</span>
                <span class="action-icon delete" onclick="deleteClassroom(${room.room_id})">🗑️</span>
            </td>
        </tr>
    `).join('');
}

let currentClassroomId = null;

function openClassroomModal(classroomId = null) {
    currentClassroomId = classroomId;
    const modal = document.getElementById('classroomModal');
    const form = document.getElementById('classroomForm');
    const title = document.getElementById('classroomModalTitle');

    title.textContent = classroomId ? 'Edit Classroom' : 'Add New Classroom';
    form.reset();

    if (classroomId) {
        const room = classrooms.find(r => r.room_id === classroomId);
        if (room) {
            form.room_no.value = room.room_no;
            form.capacity.value = room.capacity || '';
            form.type.value = room.type || '';
        }
    }

    modal.classList.add('active');
}

function closeClassroomModal() {
    document.getElementById('classroomModal').classList.remove('active');
    currentClassroomId = null;
}

document.getElementById('classroomForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
        room_no: formData.get('room_no'),
        capacity: formData.get('capacity') ? parseInt(formData.get('capacity')) : null,
        type: formData.get('type')
    };

    try {
        if (currentClassroomId) {
            await apiRequest(`/classrooms/${currentSchoolId}/${currentClassroomId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showAlert('Classroom updated successfully', 'success');
        } else {
            await apiRequest(`/classrooms/${currentSchoolId}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showAlert('Classroom added successfully', 'success');
        }

        closeClassroomModal();
        await loadClassrooms();
        await loadAllData();
    } catch (error) {
        showAlert(error.message, 'error');
    }
});

async function deleteClassroom(classroomId) {
    if (!confirm('Are you sure you want to delete this classroom?')) return;

    try {
        await apiRequest(`/classrooms/${currentSchoolId}/${classroomId}`, {
            method: 'DELETE'
        });
        showAlert('Classroom deleted successfully', 'success');
        await loadClassrooms();
        await loadAllData();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// ========== TIMESLOTS PAGE ==========

async function loadTimeslots() {
    try {
        timeslots = await apiRequest(`/timeslots/${currentSchoolId}`);
        displayTimeslots();
    } catch (error) {
        console.error('Error loading timeslots:', error);
        showAlert('Failed to load timeslots', 'error');
    }
}

function displayTimeslots() {
    const tbody = document.getElementById('timeslotsTableBody');
    if (timeslots.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No timeslots found</td></tr>';
        return;
    }

    tbody.innerHTML = timeslots.map(timeslot => `
        <tr>
            <td>${timeslot.day}</td>
            <td>${formatTime(timeslot.start_time)}</td>
            <td>${formatTime(timeslot.end_time)}</td>
            <td>${timeslot.total_time || 0} min</td>
            <td>
                <span class="action-icon edit" onclick="openTimeslotModal(${timeslot.timeslot_id})">✏️</span>
                <span class="action-icon delete" onclick="deleteTimeslot(${timeslot.timeslot_id})">🗑️</span>
            </td>
        </tr>
    `).join('');
}

let currentTimeslotId = null;

function openTimeslotModal(timeslotId = null) {
    currentTimeslotId = timeslotId;
    const modal = document.getElementById('timeslotModal');
    const form = document.getElementById('timeslotForm');
    const title = document.getElementById('timeslotModalTitle');

    title.textContent = timeslotId ? 'Edit Timeslot' : 'Add New Timeslot';
    form.reset();

    if (timeslotId) {
        const timeslot = timeslots.find(t => t.timeslot_id === timeslotId);
        if (timeslot) {
            form.day.value = timeslot.day;
            form.start_time.value = timeslot.start_time;
            form.end_time.value = timeslot.end_time;
        }
    }

    modal.classList.add('active');
}

function closeTimeslotModal() {
    document.getElementById('timeslotModal').classList.remove('active');
    currentTimeslotId = null;
}

document.getElementById('timeslotForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
        day: formData.get('day'),
        start_time: formData.get('start_time'),
        end_time: formData.get('end_time')
    };

    try {
        if (currentTimeslotId) {
            await apiRequest(`/timeslots/${currentSchoolId}/${currentTimeslotId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showAlert('Timeslot updated successfully', 'success');
        } else {
            await apiRequest(`/timeslots/${currentSchoolId}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showAlert('Timeslot added successfully', 'success');
        }

        closeTimeslotModal();
        await loadTimeslots();
        await loadAllData();
    } catch (error) {
        showAlert(error.message, 'error');
    }
});

async function deleteTimeslot(timeslotId) {
    if (!confirm('Are you sure you want to delete this timeslot?')) return;

    try {
        await apiRequest(`/timeslots/${currentSchoolId}/${timeslotId}`, {
            method: 'DELETE'
        });
        showAlert('Timeslot deleted successfully', 'success');
        await loadTimeslots();
        await loadAllData();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// User menu functions
function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) {
        menu.classList.toggle('active');
    }
}

function setupUserMenu() {
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('userMenu');
        const avatar = document.getElementById('userAvatar');
        const container = document.querySelector('.user-menu-container');
        
        if (menu && container && !container.contains(e.target)) {
            menu.classList.remove('active');
        }
    });
}

function goToDashboard() {
    window.location.href = 'dashboard.html';
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        clearAuth();
        window.location.href = 'index.html';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

// Event listener is attached in loadClassesForTimetable() after dropdown is populated

