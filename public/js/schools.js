// School management functions

let currentUserId = null;

function persistUserId(userId) {
    if (!userId) return;
    currentUserId = String(userId);
    if (getAuthToken()) {
        localStorage.setItem('userId', currentUserId);
    } else {
        localStorage.setItem('guestId', currentUserId);
        localStorage.removeItem('userId');
    }
}

// Initialize dashboard
async function initDashboard() {
    const userId = getUserId();
    const token = getAuthToken();

    if (token) {
        try {
            const user = await apiRequest('/auth/me');
            if (user?.user_id) {
                persistUserId(user.user_id);
            }
        } catch {
            clearAuth();
            currentUserId = null;
        }
    } else if (userId) {
        currentUserId = userId;
    } else {
        currentUserId = null;
    }

    await loadSchools();
}

// Load schools
async function loadSchools() {
    try {
        let url = '/schools';
        if (currentUserId) {
            url += `?userId=${currentUserId}`;
        }
        // For guest mode (no userId), backend returns empty array - no schools pre-created
        const schools = await apiRequest(url);
        console.log('Loaded schools:', schools);
        
        // If we got schools but don't have a userId, store it from the first school
        if (schools.length > 0 && schools[0].userId) {
            persistUserId(schools[0].userId);
        }

        // Stale local userId (e.g. from localhost) — clear so createSchool gets a fresh guest
        if (schools.length === 0 && currentUserId && !getAuthToken()) {
            localStorage.removeItem('guestId');
            localStorage.removeItem('userId');
            currentUserId = null;
        }
        
        displaySchools(schools);
    } catch (error) {
        console.error('Error loading schools:', error);
        showAlert('Failed to load schools', 'error');
    }
}

// Display schools
function displaySchools(schools) {
    const container = document.getElementById('schoolsContainer');
    if (!container) return;

    if (schools.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏫</div>
                <p>No schools yet. Create your first school to get started!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = schools.map(school => `
        <div class="school-card" onclick="window.location.href='school.html?schoolId=${school.school_id}'">
            <div class="school-icon">🏫</div>
            <div class="school-name">${school.school_name}</div>
            <div class="school-date">Created on ${formatDate(school.created_at)}</div>
            <button class="btn btn-danger" onclick="event.stopPropagation(); deleteSchool(${school.school_id})" style="width: 100%; margin-top: 1rem;">
                🗑️ Delete
            </button>
        </div>
    `).join('');
}

// Create school
async function createSchool() {
    const nameInput = document.getElementById('newSchoolName');
    const schoolName = nameInput?.value.trim();

    if (!schoolName) {
        showAlert('Please enter a school name', 'error');
        return;
    }

    try {
        const data = {
            schoolName
        };
        if (currentUserId) {
            data.userId = currentUserId;
        }

        const school = await apiRequest('/schools', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        // Always sync userId from server (handles stale ids + new guest users)
        if (school.userId) {
            persistUserId(school.userId);
        }

        showAlert('School created successfully!', 'success');
        nameInput.value = '';
        
        // Reload schools - now with the correct userId
        await loadSchools();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// Delete school
async function deleteSchool(schoolId) {
    if (!confirm('Are you sure you want to delete this school? This will delete all associated data.')) {
        return;
    }

    try {
        let url = `/schools/${schoolId}`;
        if (currentUserId) {
            url += `?userId=${currentUserId}`;
        }
        await apiRequest(url, {
            method: 'DELETE'
        });

        showAlert('School deleted successfully', 'success');
        await loadSchools();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();

    const createForm = document.getElementById('createSchoolForm');
    if (createForm) {
        createForm.addEventListener('submit', (e) => {
            e.preventDefault();
            createSchool();
        });
    }
});

