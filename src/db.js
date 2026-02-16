const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function getDB() {
    return open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });
}

async function initDB() {
    const db = await getDB();
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('Database initialized successfully: database.sqlite');
    return db;
}

module.exports = { getDB, initDB };
