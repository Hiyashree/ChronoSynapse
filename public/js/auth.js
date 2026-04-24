// Authentication functions

async function signup(data) {
    const response = await apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (response.token) {
        setAuthToken(response.token, response.userId);
        localStorage.setItem('username', data.username);
        if (data.email) {
            localStorage.setItem('email', data.email);
        }
    }

    return response;
}

async function signin(data) {
    const response = await apiRequest('/auth/signin', {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (response.token) {
        setAuthToken(response.token, response.userId);
        // Try to get user info to store email
        try {
            const user = await apiRequest('/auth/me');
            if (user) {
                localStorage.setItem('username', user.username || data.username || '');
                if (user.email) {
                    localStorage.setItem('email', user.email);
                }
            }
        } catch (error) {
            // If API fails, just use what we have
            console.error('Could not fetch user info:', error);
        }
    }

    return response;
}

function logout() {
    clearAuth();
    window.location.href = 'index.html';
}

