// Database configuration selector
require('dotenv').config();

let database;

if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'your_mysql_password') {
  console.log('🗃️  Using SQLite database for local development');
  database = require('./database-sqlite');
} else {
  console.log('🗃️  Using MySQL database');
  database = require('./database');
}

module.exports = database;
