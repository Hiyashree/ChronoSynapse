const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'timetable_titan',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully');
        console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   Database: ${process.env.DB_NAME || 'timetable_titan'}`);
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database connection error:', err.message);
        console.error('   Please check:');
        console.error('   1. MySQL is running');
        console.error('   2. Database exists: CREATE DATABASE timetable_titan;');
        console.error('   3. .env file has correct credentials');
        console.error('   4. Schema is imported: mysql -u root -p timetable_titan < schema.sql');
    });

module.exports = pool;

