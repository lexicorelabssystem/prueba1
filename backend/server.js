import express from "express";
import pkg from "pg";
import dotenv from "dotenv";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { Document, Packer, Paragraph, TextRun } from "docx";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const { Pool } = pkg;

// Configurar directorio
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Servir frontend
app.use(express.static(path.join(__dirname, "fronted")));

// Base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Test de conexión DB
(async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("DB conectada ✅:", res.rows[0]);
  } catch (err) {
    console.error("❌ Error conectando a la DB:", err);
  }
})();

// -------------------- RUTAS --------------------

// Servir frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "fronted", "index.html"));
});

// Ping
app.get("/ping", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: "Error en DB" });
  }
});

// Pedidos
app.get("/pedidos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pedidos_importaciones ORDER BY fecha DESC");
    res.json({ pedidos: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/nuevo-pedido", async (req, res) => {
  const { cliente, producto, cantidad, proveedor } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO pedidos_importaciones (cliente, producto, cantidad, proveedor, estado)
       VALUES ($1, $2, $3, $4, 'Pendiente') RETURNING *`,
      [cliente, producto, cantidad, proveedor]
    );
    res.json({ mensaje: "Pedido creado ✅", pedido: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inventario
app.get("/api/inventario", async (req, res) => {
  try {
    const result
