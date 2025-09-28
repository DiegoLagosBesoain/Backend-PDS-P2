const { Pool } = require("pg");
const { v4: uuid } = require("uuid");
require("dotenv").config();
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD ,
  database: process.env.PGDATABASE || "PDS",
});

// Helpers
async function getComponentsByProcess(processId) {
  const res = await pool.query(
    `SELECT * FROM components WHERE process_id = $1`,
    [processId]
  );
  return res.rows;
}

async function getConnectionsByProcess(processId) {
  const res = await pool.query(
    `SELECT * FROM connections WHERE process_id = $1`,
    [processId]
  );
  return res.rows;
}

async function getElementsByProcess(processId) {
  const res = await pool.query(
    `SELECT * FROM elements WHERE process_id = $1`,
    [processId]
  );
  return res.rows;
}

// Insertar un componente
async function insertComponent(data) {
  const id = uuid();
  const { process_id, type, label, pos_x, pos_y, params } = data;
  await pool.query(
    `INSERT INTO components(id, process_id, type, label, pos_x, pos_y, params)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [id, process_id, type, label, pos_x, pos_y, params || {}]
  );
  return { id, ...data };
}

// Similar para connections, elements, processes...
// async function insertConnection(data) { ... }
// async function insertElement(data) { ... }

module.exports = {
  getComponentsByProcess,
  getConnectionsByProcess,
  getElementsByProcess,
  insertComponent,
  // insertConnection,
  // insertElement,
  uuid,
  pool, // opcional para consultas ad-hoc
};