import dotenv from 'dotenv';
dotenv.config();

let activeDb: any = null;

export const setActiveDb = (db: any) => {
  activeDb = db;
};

// Lazy-loaded SQLite for Node environment (migrations & seeds)
let nodeDb: any = null;
const getNodeDb = () => {
  if (nodeDb) return nodeDb;
  try {
    // Dynamic require so esbuild/wrangler doesn't bundle the native sqlite3 module
    const sqlite3 = require('sqlite3');
    const path = require('path');
    const fs = require('fs');

    const dbPath = process.env.DB_PATH || './src/database/creciendo_juntos.sqlite';
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    nodeDb = new sqlite3.Database(dbPath, (err: any) => {
      if (err) {
        console.error('Error connecting to Node SQLite:', err.message);
      } else {
        nodeDb.run('PRAGMA foreign_keys = ON;');
      }
    });
    return nodeDb;
  } catch (err: any) {
    throw new Error('SQLite3 no está disponible en este entorno serverless. Asegúrese de inicializar activeDb con D1.');
  }
};

export const query = async (sql: string, params: any[] = []): Promise<any[]> => {
  if (activeDb && typeof activeDb.prepare === 'function') {
    const stmt = activeDb.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const res = await bound.all();
    return res.results || [];
  }

  return new Promise((resolve, reject) => {
    const db = getNodeDb();
    db.all(sql, params, (err: any, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const getOne = async (sql: string, params: any[] = []): Promise<any> => {
  if (activeDb && typeof activeDb.prepare === 'function') {
    const stmt = activeDb.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const res = await bound.first();
    return res || null;
  }

  return new Promise((resolve, reject) => {
    const db = getNodeDb();
    db.get(sql, params, (err: any, row: any) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const run = async (sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> => {
  if (activeDb && typeof activeDb.prepare === 'function') {
    const stmt = activeDb.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const res = await bound.run();
    return { lastID: res.meta.last_row_id || 0, changes: res.meta.changes || 0 };
  }

  return new Promise((resolve, reject) => {
    const db = getNodeDb();
    db.run(sql, params, function (this: any, err: any) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID || 0, changes: this.changes || 0 });
    });
  });
};

export const exec = async (sql: string): Promise<void> => {
  if (activeDb && typeof activeDb.prepare === 'function') {
    await activeDb.exec(sql);
    return;
  }

  return new Promise((resolve, reject) => {
    const db = getNodeDb();
    db.exec(sql, (err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export default { query, getOne, run, exec, setActiveDb };
