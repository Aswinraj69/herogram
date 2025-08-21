const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create SQLite database
const dbPath = path.join(__dirname, 'painting_generator.db');
console.log('SQLite database path:', dbPath);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err);
  } else {
    console.log('SQLite database opened successfully');
  }
});

async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create titles table
      db.run(`
        CREATE TABLE IF NOT EXISTS titles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          title VARCHAR(255) NOT NULL,
          instructions TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      // Create references2 table
      db.run(`
        CREATE TABLE IF NOT EXISTS references2 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title_id INTEGER,
          user_id INTEGER NOT NULL,
          image_data TEXT NOT NULL,
          is_global BOOLEAN DEFAULT false,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      // Create ideas table
      db.run(`
        CREATE TABLE IF NOT EXISTS ideas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title_id INTEGER NOT NULL,
          summary TEXT NOT NULL,
          full_prompt TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE
        )
      `);
      
      // Create paintings table
      db.run(`
        CREATE TABLE IF NOT EXISTS paintings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title_id INTEGER NOT NULL,
          idea_id INTEGER NOT NULL,
          image_url VARCHAR(255),
          image_data TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          error_message VARCHAR(255),
          used_reference_ids TEXT DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE,
          FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating tables:', err);
          reject(err);
        } else {
          console.log('SQLite database initialized successfully');
          resolve();
        }
      });
    });
  });
}

// Wrapper functions to mimic mysql2 pool interface
const pool = {
  execute: (query, params = []) => {
    return new Promise((resolve, reject) => {
      // SQLite query execution
      
      const trimmedQuery = query.trim();
      const upperQuery = trimmedQuery.toUpperCase();
      
      if (upperQuery.startsWith('SELECT')) {
        db.all(query, params, (err, rows) => {
          if (err) {
            console.error('SQLite SELECT Error:', err);
            reject(err);
          } else {
            // Ensure rows is always an array
            const resultRows = rows || [];
            resolve([resultRows]);
          }
        });
      } else if (query.trim().toUpperCase().startsWith('INSERT')) {
        db.run(query, params, function(err) {
          if (err) {
            console.error('SQLite INSERT Error:', err);
            reject(err);
          } else {
            resolve([{ insertId: this.lastID, affectedRows: this.changes }]);
          }
        });
      } else {
        db.run(query, params, function(err) {
          if (err) {
            console.error('SQLite UPDATE/DELETE Error:', err);
            reject(err);
          } else {
            resolve([{ affectedRows: this.changes }]);
          }
        });
      }
    });
  }
};

module.exports = { pool, initializeDatabase };
