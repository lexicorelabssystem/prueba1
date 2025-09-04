import express from "express";
import pkg from "pg";
import dotenv from "dotenv";
import PDFDocument from "pdfkit";
import fs from "fs";
import ExcelJS from "exceljs";
import { Document, Packer, Paragraph, TextRun } from "docx";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(express.json());
app.use(express.static("public"));

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

// Test de conexión
app.get("/", (req, res) => {
  res.json({ mensaje: "API de importaciones funcionando 🚀" });
});

// Listar pedidos
app.get("/pedidos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pedidos_importaciones ORDER BY fecha DESC");
    res.json({ pedidos: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear nuevo pedido
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

// Consultar inventario
app.get("/api/inventario", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM inventario ORDER BY producto");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Registrar entrada al inventario
app.post("/api/inventario/entrada", async (req, res) => {
  const { producto, cantidad } = req.body;

  try {
    const client = await pool.connect();
    await client.query("BEGIN");

    const result = await client.query("SELECT * FROM inventario WHERE producto = $1 FOR UPDATE", [producto]);

    if (result.rows.length > 0) {
      await client.query("UPDATE inventario SET cantidad = cantidad + $1 WHERE producto = $2", [cantidad, producto]);
    } else {
      await client.query("INSERT INTO inventario (producto, cantidad) VALUES ($1, $2)", [producto, cantidad]);
    }

    // Registrar movimiento
    await client.query(
      "INSERT INTO movimientos_inventario (producto, cantidad, tipo, referencia) VALUES ($1, $2, 'entrada', $3)",
      [producto, cantidad, "Entrada manual desde bot"]
    );

    await client.query("COMMIT");
    client.release();

    res.json({ mensaje: `📦 ${cantidad} unidades de ${producto} agregadas al inventario` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar estado de pedido
app.post("/api/pedidos/:id/estado", async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const pedidoRes = await client.query("SELECT * FROM pedidos_importaciones WHERE id = $1 FOR UPDATE", [id]);
    const pedido = pedidoRes.rows[0];
    if (!pedido) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    if (pedido.estado === "Pendiente" && estado === "Enviado") {
      const stockRes = await client.query("SELECT * FROM inventario WHERE producto = $1 FOR UPDATE", [pedido.producto]);
      const stock = stockRes.rows[0];

      if (!stock || stock.cantidad < pedido.cantidad) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Stock insuficiente de ${pedido.producto}. Disponible: ${stock ? stock.cantidad : 0}` });
      }

      await client.query("UPDATE inventario SET cantidad = cantidad - $1 WHERE producto = $2", [pedido.cantidad, pedido.producto]);
      await client.query(
        "INSERT INTO movimientos_inventario (producto, cantidad, tipo, referencia) VALUES ($1, $2, 'salida', $3)",
        [pedido.producto, pedido.cantidad, `Pedido #${pedido.id}`]
      );
    }

    const updateRes = await client.query(
      "UPDATE pedidos_importaciones SET estado = $1 WHERE id = $2 RETURNING *",
      [estado, id]
    );

    await client.query("COMMIT");
    client.release();

    res.json({ mensaje: "✅ Estado actualizado", pedido: updateRes.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    client.release();
    res.status(500).json({ error: err.message });
  }
});

// Listar movimientos (opcional)
app.get("/api/movimientos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM movimientos_inventario ORDER BY fecha DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Historial de pedidos
app.get("/api/historial/pedidos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pedidos_importaciones ORDER BY fecha DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Historial de movimientos
app.get("/api/historial/movimientos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM movimientos_inventario ORDER BY fecha DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Descargar historial en PDF
app.get("/api/descargar/pdf", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pedidos_importaciones ORDER BY fecha DESC");

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=historial.pdf");

    doc.pipe(res);

    doc.fontSize(18).text("Historial de Pedidos", { align: "center" });
    doc.moveDown();

    result.rows.forEach(p => {
      doc.fontSize(12).text(
        `Cliente: ${p.cliente} | Producto: ${p.producto} | Cantidad: ${p.cantidad} | Estado: ${p.estado} | Fecha: ${p.fecha}`
      );
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/descargar/excel", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pedidos_importaciones ORDER BY fecha DESC");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Historial Pedidos");

    sheet.columns = [
      { header: "Cliente", key: "cliente" },
      { header: "Producto", key: "producto" },
      { header: "Cantidad", key: "cantidad" },
      { header: "Proveedor", key: "proveedor" },
      { header: "Estado", key: "estado" },
      { header: "Fecha", key: "fecha" },
    ];

    result.rows.forEach(p => {
      sheet.addRow(p);
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=historial.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/descargar/word", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pedidos_importaciones ORDER BY fecha DESC");

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Historial de Pedidos", bold: true, size: 28 })],
            }),
            ...result.rows.map(p =>
              new Paragraph(
                `Cliente: ${p.cliente} | Producto: ${p.producto} | Cantidad: ${p.cantidad} | Estado: ${p.estado} | Fecha: ${p.fecha}`
              )
            ),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader("Content-Disposition", "attachment; filename=historial.docx");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor corriendo en http://localhost:${PORT}`));
