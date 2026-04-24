const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

// Test endpoint to check if backend is running
router.get('/', async (req, res) => {
    try {
        // Test database connection
        const [result] = await pool.execute('SELECT 1 as test');
        res.json({ 
            status: 'ok', 
            message: 'Backend is running',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: 'Backend is running but database connection failed',
            error: error.message
        });
    }
});

module.exports = router;



