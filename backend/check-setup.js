// Quick setup checker
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function checkSetup() {
    console.log('🔍 Checking Timetable Titan Setup...\n');

    // Check .env file
    console.log('1. Checking .env file...');
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        console.log('   ✅ .env file exists');
    } else {
        console.log('   ❌ .env file NOT found');
        console.log('   📝 Create it from .env.example');
        return;
    }

    // Check environment variables
    console.log('\n2. Checking environment variables...');
    const required = ['DB_HOST', 'DB_USER', 'DB_NAME'];
    let allPresent = true;
    required.forEach(key => {
        if (process.env[key]) {
            console.log(`   ✅ ${key} = ${process.env[key]}`);
        } else {
            console.log(`   ❌ ${key} is missing`);
            allPresent = false;
        }
    });

    if (!allPresent) {
        console.log('   ⚠️  Please set all required variables in .env');
        return;
    }

    // Check database connection
    console.log('\n3. Testing database connection...');
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'timetable_titan'
        });

        console.log('   ✅ Connected to MySQL');

        // Check if database exists
        const [databases] = await connection.execute(
            `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
            [process.env.DB_NAME]
        );

        if (databases.length === 0) {
            console.log(`   ❌ Database '${process.env.DB_NAME}' does NOT exist`);
            console.log(`   📝 Run: CREATE DATABASE ${process.env.DB_NAME};`);
            await connection.end();
            return;
        }

        console.log(`   ✅ Database '${process.env.DB_NAME}' exists`);

        // Check if tables exist
        const [tables] = await connection.execute(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
            [process.env.DB_NAME]
        );

        if (tables.length === 0) {
            console.log('   ❌ No tables found in database');
            console.log('   📝 Run: mysql -u root -p timetable_titan < schema.sql');
            await connection.end();
            return;
        }

        console.log(`   ✅ Found ${tables.length} tables in database`);

        await connection.end();
    } catch (error) {
        console.log('   ❌ Database connection failed');
        console.log(`   Error: ${error.message}`);
        console.log('   📝 Check:');
        console.log('      - MySQL is running');
        console.log('      - Database credentials in .env are correct');
        return;
    }

    // Check node_modules
    console.log('\n4. Checking dependencies...');
    const nodeModulesPath = path.join(__dirname, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
        console.log('   ✅ node_modules exists');
    } else {
        console.log('   ❌ node_modules NOT found');
        console.log('   📝 Run: npm install');
        return;
    }

    console.log('\n✅ Setup looks good! You can start the server with: npm start');
}

checkSetup().catch(console.error);



