// Common utility functions

const API_BASE = '/api';

// Get auth token from localStorage
function getAuthToken() {
    return localStorage.getItem('token');
}

// Get user ID from localStorage
function getUserId() {
    return localStorage.getItem('userId');
}

// Set auth token
function setAuthToken(token, userId) {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
}

// Clear auth
function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getAuthToken();
}

// API request helper
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        console.log(`[API] ${options.method || 'GET'} ${API_BASE}${endpoint}`, options.body || '');
        
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            console.error('[API] Non-JSON response:', text);
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        if (!response.ok) {
            console.error('[API] Error response:', data);
            throw new Error(data.error || `Request failed: ${response.status} ${response.statusText}`);
        }

        console.log('[API] Success:', data);
        return data;
    } catch (error) {
        console.error('[API] Request failed:', error);
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error('Cannot connect to server. Make sure the backend is running on port 3000.');
        }
        throw error;
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
    }).format(amount);
}

// Format time
function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

// Show alert
function showAlert(message, type = 'success') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    const container = document.querySelector('main') || document.body;
    container.insertBefore(alert, container.firstChild);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Show loading
function showLoading(element) {
    element.innerHTML = '<div class="spinner"></div>';
}

// Get URL parameter
function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Get path parameter (e.g., /school/:id)
function getPathParam() {
    const schoolId = getUrlParam('schoolId');
    if (schoolId) return schoolId;

    const path = window.location.pathname;
    const parts = path.split('/');
    return parts[parts.length - 1];
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export CSV
function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        showAlert('No data to export', 'error');
        return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',') 
                    ? `"${value}"` 
                    : value;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// Initialize user avatar
function initUserAvatar() {
    const avatar = document.querySelector('.user-avatar');
    if (avatar) {
        const userId = getUserId();
        const username = localStorage.getItem('username') || 'U';
        const initial = username.charAt(0).toUpperCase();
        avatar.textContent = initial;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initUserAvatar();
});

