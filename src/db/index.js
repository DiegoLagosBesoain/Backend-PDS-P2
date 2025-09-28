const { Pool } = require("pg");
require("dotenv").config();
console.log(typeof process.env.PGPASSWORD, process.env.PGPASSWORD);
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || "PDS",
  user: process.env.PGUSER ,
  password: process.env.PGPASSWORD ,
});

module.exports = pool;