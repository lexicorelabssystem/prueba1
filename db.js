const { Pool } = require('pg'); // Importa el módulo 'pg' para conectar con PostgreSQL
require('dotenv').config(); // Carga las variables de entorno desde el archivo .env

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,     // Usuario de la base de datos
  host: process.env.DB_HOST,     // Host, normalmente localhost
  database: process.env.DB_NAME, // Nombre de la base de datos
  password: process.env.DB_PASS, // Contraseña
  port: process.env.DB_PORT,     // Puerto (5432 por defecto)
});

module.exports = pool; // Exporta la conexión para usarla en otros archivos


