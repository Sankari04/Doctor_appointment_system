const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const dbDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dbDir, 'doctor_appointment.db');

const initializeSqlite = () => {
  fs.mkdirSync(dbDir, { recursive: true });

  const db = new sqlite3.Database(dbPath);

  const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({
        lastID: this.lastID,
        changes: this.changes,
        insertId: this.lastID,
        affectedRows: this.changes
      });
    });
  });

  const query = (sql, params = []) => new Promise((resolve, reject) => {
    const statement = sql.trim();
    const isSelect = /^SELECT\s+/i.test(statement) || /^WITH\s+/i.test(statement);

    if (isSelect) {
      db.all(statement, params, (err, rows) => {
        if (err) return reject(err);
        resolve([rows]);
      });
      return;
    }

    run(statement, params)
      .then((result) => resolve([result]))
      .catch(reject);
  });

  const makeConnection = () => ({
    query,
    beginTransaction: () => new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => err ? reject(err) : resolve());
    }),
    commit: () => new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => err ? reject(err) : resolve());
    }),
    rollback: () => new Promise((resolve, reject) => {
      db.run('ROLLBACK', (err) => err ? reject(err) : resolve());
    }),
    release: () => {}
  });

  const schema = [
    `CREATE TABLE IF NOT EXISTS specializations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      gender TEXT,
      dob TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      specialization_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      bio TEXT,
      experience INTEGER NOT NULL DEFAULT 0,
      consultation_fee REAL NOT NULL DEFAULT 0,
      is_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(specialization_id) REFERENCES specializations(id) ON DELETE RESTRICT
    )`,
    `CREATE TABLE IF NOT EXISTS doctor_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      is_booked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      slot_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'booked',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY(doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY(slot_id) REFERENCES doctor_slots(id) ON DELETE RESTRICT
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS unique_doctor_datetime_slot ON doctor_slots (doctor_id, date, start_time)`
  ];

  const initSqlite = async () => {
    for (const statement of schema) {
      await run(statement);
    }

    const defaultSpecializations = [
      ['Cardiology', 'Heart health and cardiovascular care'],
      ['Dermatology', 'Skin, hair, and nail conditions'],
      ['Orthopedics', 'Bone, joint, and muscle care'],
      ['Neurology', 'Brain and nervous system care'],
      ['Pediatrics', 'Children and adolescent health'],
      ['General Medicine', 'Primary care and general consultation']
    ];

    for (const [name, description] of defaultSpecializations) {
      await run('INSERT OR IGNORE INTO specializations (name, description) VALUES (?, ?)', [name, description]);
    }
  };

  initSqlite().catch((error) => {
    console.error('SQLite initialization failed:', error);
  });

  return {
    query,
    getConnection: makeConnection,
    close: () => new Promise((resolve, reject) => db.close((err) => err ? reject(err) : resolve()))
  };
};

const createMysqlPool = () => mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'doctor_appointment_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00'
});

const mysqlPool = createMysqlPool();

// MySQL-only configuration: always use MySQL pool. This project is configured to use MySQL in production.
const getActivePool = async () => {
  // Ensure MySQL connection is available; let errors surface so the operator can fix DB connectivity.
  const connection = await mysqlPool.getConnection();
  connection.release();
  return mysqlPool;
};

const pool = {
  query: (...args) => getActivePool().then((db) => db.query(...args)),
  getConnection: async () => {
    const db = await getActivePool();
    return db.getConnection();
  },
  close: async () => {
    if (mysqlPool && typeof mysqlPool.end === 'function') {
      return mysqlPool.end();
    }
    return undefined;
  }
};

module.exports = pool;
