// School management functions

let currentUserId = null;

// Initialize dashboard
async function initDashboard() {
    // Get user ID (authenticated or guest)
    const userId = getUserId();
    if (!userId) {
        // For guest mode, we'll create a temporary user on the backend
        // Just use a placeholder for now - backend will handle it
        currentUserId = null;
    } else {
        currentUserId = userId;
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
        // This happens when a guest creates their first school
        if (schools.length > 0 && !currentUserId && schools[0].userId) {
            currentUserId = schools[0].userId;
            console.log('Stored userId from loaded schools:', currentUserId);
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
        <div class="school-card" onclick="window.location.href='/school/${school.school_id}'">
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
    const nameInput = document.getElementById('schoolName');
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

        // If we got a userId from the response (guest mode), store it
        if (school.userId && !currentUserId) {
            currentUserId = school.userId;
            console.log('Stored guest userId:', currentUserId);
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

