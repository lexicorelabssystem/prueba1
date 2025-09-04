// index.js
// -----------------------------
// Servidor Express conectado a PostgreSQL
// -----------------------------

// Importamos las librerías
const express = require("express"); // Framework web para Node.js
const { Pool } = require("pg");     // Conector de PostgreSQL
require("dotenv").config();         // Para leer variables del archivo .env

// Creamos la aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,       // Usuario de la base de datos
  host: process.env.DB_HOST,       // Servidor (ej: localhost)
  database: process.env.DB_NAME,   // Nombre de la base de datos
  password: process.env.DB_PASS,   // Contraseña
  port: process.env.DB_PORT,       // Puerto (por defecto 5432)
});

// Ruta de prueba "ping"
app.get("/ping", (req, res) => {
  res.json({ message: "Servidor funcionando correctamente 🚀" });
});

// Ruta para consultar la hora del servidor PostgreSQL
app.get("/tiempo", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ tiempo_postgres: result.rows[0].now });
  } catch (error) {
    console.error("Error en consulta:", error);
    res.status(500).json({ error: "Error al consultar PostgreSQL" });
  }
});

// Middleware para recibir JSON
app.use(express.json());

// --- POST /pedidos : Crear un pedido
app.post("/pedidos", async (req, res) => {
  const { cliente, producto, cantidad, proveedor } = req.body;

  if (!cliente || !producto || !cantidad || !proveedor) {
    return res.status(400).json({ error: "Faltan datos del pedido" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO pedidos_importaciones (cliente, producto, cantidad, proveedor) VALUES ($1, $2, $3, $4) RETURNING *",
      [cliente, producto, cantidad, proveedor]
    );
    res.status(201).json({ pedido: result.rows[0] });
  } catch (error) {
    console.error("Error al crear pedido:", error);
    res.status(500).json({ error: "Error al crear pedido" });
  }
});

// --- GET /pedidos : Listar todos los pedidos
app.get("/pedidos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pedidos_importaciones ORDER BY fecha DESC");
    res.json({ pedidos: result.rows });
  } catch (error) {
    console.error("Error al listar pedidos:", error);
    res.status(500).json({ error: "Error al listar pedidos" });
  }
});

// --- DELETE /pedidos/:id : Eliminar un pedido
app.delete("/pedidos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM pedidos_importaciones WHERE id = $1 RETURNING *", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }
    res.json({ mensaje: "Pedido eliminado", pedido: result.rows[0] });
  } catch (error) {
    console.error("Error al eliminar pedido:", error);
    res.status(500).json({ error: "Error al eliminar pedido" });
  }
});


// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});

// Ruta raíz
app.get("/", (req, res) => {
  res.send("🔥 Bienvenido a la API de Agente Hielo 🚀");
});