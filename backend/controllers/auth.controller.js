const pool = require('../utils/db');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');

// Sign up
const signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user exists
        const [existing] = await pool.execute(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, passwordHash]
        );

        const token = generateToken(result.insertId);

        res.status(201).json({
            message: 'User created successfully',
            token,
            userId: result.insertId
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Sign in
const signin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        // Compare password
        const isValid = await comparePassword(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user.user_id);

        res.json({
            message: 'Login successful',
            token,
            userId: user.user_id
        });
    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get current user
const getCurrentUser = async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT user_id, username, email, created_at FROM users WHERE user_id = ?',
            [req.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(users[0]);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    signup,
    signin,
    getCurrentUser
};

