const { Pool } = require('pg');
require('dotenv').config(); // Carga las variables desde .env o desde Render

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Esto funciona con Render
  ssl: {
    rejectUnauthorized: false, // Necesario en Render para PostgreSQL
  },
});

module.exports = pool;
