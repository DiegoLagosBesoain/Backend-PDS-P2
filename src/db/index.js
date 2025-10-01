const { Pool } = require("pg");
require("dotenv").config();
console.log(typeof process.env.DBPASSWORD, process.env.DBPASSWORD);
const pool = new Pool({
  host: process.env.DBHOST || "localhost",
  port: process.env.DBPORT || 5432,
  database: process.env.DBDATABASE || "PDS",
  user: process.env.DBUSER ,
  password: process.env.DBPASSWORD ,
});

module.exports = pool;