const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(express.static(path.join(__dirname, '../public')));


app.use('/api/test', require('./routes/test.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/schools', require('./routes/school.routes'));
app.use('/api/teachers', require('./routes/teacher.routes'));
app.use('/api/subjects', require('./routes/subject.routes'));
app.use('/api/classes', require('./routes/class.routes'));
app.use('/api/sections', require('./routes/section.routes'));
app.use('/api/classrooms', require('./routes/classroom.routes'));
app.use('/api/timeslots', require('./routes/timeslot.routes'));
app.use('/api/timetable', require('./routes/timetable.routes'));

// Serve frontend pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/signup.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('/school/:schoolId', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/school.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ error: err.message || 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, '../public')}`);
    console.log(`🔗 Test endpoint: http://localhost:${PORT}/api/test`);
    console.log(`\n⚠️  Make sure:`);
    console.log(`   1. MySQL is running`);
    console.log(`   2. Database 'timetable_titan' exists`);
    console.log(`   3. Schema is imported`);
    console.log(`   4. .env file is configured\n`);
});

