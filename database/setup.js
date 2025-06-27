const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'food_delivery.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// Create database and tables
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database.');
});

// Read and execute schema
const schema = fs.readFileSync(schemaPath, 'utf8');
const statements = schema.split(';').filter(stmt => stmt.trim());

db.serialize(() => {
    statements.forEach((statement) => {
        if (statement.trim()) {
            db.run(statement, (err) => {
                if (err) {
                    console.error('Error executing statement:', err.message);
                    console.error('Statement:', statement);
                }
            });
        }
    });
});

db.close((err) => {
    if (err) {
        console.error('Error closing database:', err.message);
    } else {
        console.log('Database setup completed successfully!');
    }
});