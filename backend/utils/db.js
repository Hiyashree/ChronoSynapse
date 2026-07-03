const fs = require('fs');
const path = require('path');
require('dotenv').config();

function resolveDbType() {
    if (process.env.DB_TYPE) {
        return process.env.DB_TYPE.toLowerCase();
    }
    if (process.env.DATABASE_URL) {
        if (process.env.DATABASE_URL.startsWith('postgres')) {
            return 'postgres';
        }
        if (process.env.DATABASE_URL.startsWith('mysql')) {
            return 'mysql';
        }
    }
    return 'sqlite';
}

const DB_TYPE = resolveDbType();
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = process.env.DB_PATH
    ? path.resolve(__dirname, '..', process.env.DB_PATH)
    : path.join(dataDir, 'chronosynapse.db');

function getSqlOperation(sql) {
    const cleaned = sql
        .trim()
        .replace(/^\/\*[\s\S]*?\*\//, '')
        .replace(/^--.*$/gm, '')
        .trim();
    return cleaned.split(/\s+/)[0].toUpperCase();
}

function convertPlaceholders(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
}

function getInsertId(row) {
    if (!row) return null;
    const idKey = Object.keys(row).find(key => key.endsWith('_id'));
    return idKey ? Number(row[idKey]) : Number(Object.values(row)[0]);
}

function saveSqliteDatabase(db) {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
}

function createSqlitePool() {
    const { DatabaseSync } = require('node:sqlite');

    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');

    const schemaPath = path.join(__dirname, '..', 'schema.sqlite.sql');
    db.exec(fs.readFileSync(schemaPath, 'utf8'));

    console.log('✅ SQLite database ready');
    console.log(`   Path: ${dbPath}`);

    return {
        execute(sql, params = []) {
            return new Promise((resolve, reject) => {
                try {
                    const op = getSqlOperation(sql);
                    const stmt = db.prepare(sql);

                    if (op === 'SELECT' || op === 'WITH') {
                        const rows = stmt.all(...params);
                        resolve([rows, []]);
                        return;
                    }

                    const result = stmt.run(...params);
                    saveSqliteDatabase(db);
                    resolve([{
                        insertId: Number(result.lastInsertRowid),
                        affectedRows: result.changes
                    }, []]);
                } catch (error) {
                    reject(error);
                }
            });
        },

        getConnection() {
            return Promise.resolve({ release() {} });
        }
    };
}

function createMysqlPool() {
    const mysql = require('mysql2/promise');

    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'timetable_titan',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined
    });

    pool.getConnection()
        .then(connection => {
            console.log('✅ MySQL database connected successfully');
            console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
            console.log(`   Database: ${process.env.DB_NAME || 'timetable_titan'}`);
            connection.release();
        })
        .catch(err => {
            console.error('❌ MySQL connection error:', err.message);
            console.error('   Tip: set DB_TYPE=sqlite in .env for local development.');
        });

    return pool;
}

function createPostgresPool() {
    const { Pool } = require('pg');
    const schemaPath = path.join(__dirname, '..', 'schema.postgres.sql');
    const useSsl = process.env.DB_SSL !== 'false';

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: useSsl ? { rejectUnauthorized: false } : false
    });

    async function initSchema() {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        const statements = schemaSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(Boolean);

        for (const statement of statements) {
            await pool.query(statement);
        }
    }

    initSchema()
        .then(() => {
            console.log('✅ PostgreSQL database ready');
            if (process.env.DATABASE_URL) {
                console.log('   Connected via DATABASE_URL');
            } else {
                console.log(`   Database: ${process.env.DB_NAME || 'postgres'}`);
            }
        })
        .catch(err => {
            console.error('❌ PostgreSQL setup error:', err.message);
        });

    return {
        async execute(sql, params = []) {
            const op = getSqlOperation(sql);
            let pgSql = convertPlaceholders(sql);

            if (op === 'INSERT' && !/RETURNING/i.test(pgSql)) {
                pgSql = `${pgSql.trim().replace(/;+\s*$/, '')} RETURNING *`;
            }

            const result = await pool.query(pgSql, params);

            if (op === 'SELECT' || op === 'WITH') {
                return [result.rows, []];
            }

            return [{
                insertId: getInsertId(result.rows[0]),
                affectedRows: result.rowCount
            }, []];
        },

        getConnection() {
            return Promise.resolve({ release() {} });
        }
    };
}

let pool;
if (DB_TYPE === 'mysql') {
    pool = createMysqlPool();
} else if (DB_TYPE === 'postgres' || DB_TYPE === 'postgresql') {
    pool = createPostgresPool();
} else {
    pool = createSqlitePool();
}

module.exports = pool;
