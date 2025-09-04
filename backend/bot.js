import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const conversaciones = {};



const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// ---------- FUNCIONES REUTILIZABLES ----------
const getInventario = async () => (await fetch("http://localhost:3000/api/inventario")).json();
const getPedidos = async () => {
  const res = await fetch("http://localhost:3000/pedidos");
  const data = await res.json();
  return data.pedidos || [];
};
const postPedido = async (pedido) =>
  (await fetch("http://localhost:3000/api/nuevo-pedido", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pedido),
  })).json();
const postInventario = async (producto, cantidad) =>
  (await fetch("http://localhost:3000/api/inventario/entrada", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ producto, cantidad }),
  })).json();
const mensajeError = (chatId, err) => bot.sendMessage(chatId, `❌ Error: ${err.message}`);





// ---------- COMANDOS ----------
bot.onText(/\/stock/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const inventario = await getInventario();
    if (!inventario.length) return bot.sendMessage(chatId, "📦 Inventario vacío.");
    const texto = inventario.map(i => `- ${i.producto}: ${i.cantidad}`).join("\n");
    bot.sendMessage(chatId, `📦 Inventario disponible:\n${texto}`);
  } catch (err) { mensajeError(chatId, err); }
});

const usuariosAutorizados = [6762915467]; // tu ID de Telegram
const CLAVE_SECRETA = process.env.CLAVE_INVENTARIO; // ejemplo, pon lo que quieras

bot.onText(/\/agregar (.+) (\d+) (\S+)/, async (msg, match) => {
  const chatId = msg.chat.id;

  if (!usuariosAutorizados.includes(chatId)) {
    return bot.sendMessage(chatId, "❌ No tienes permiso para agregar productos.");
  }

  const producto = match[1].trim();
  const cantidad = Number(match[2]);
  const clave = match[3].trim();

  if (clave !== CLAVE_SECRETA) {
    return bot.sendMessage(chatId, "❌ Clave incorrecta. No tienes permisos.");
  }

  if (!producto || cantidad <= 0) {
    return bot.sendMessage(chatId, "❌ Formato: /agregar Broca 10 miClaveSecreta123");
  }

  try {
    const data = await postInventario(producto, cantidad);
    bot.sendMessage(chatId, `✅ ${data.mensaje}`);
  } catch (err) {
    mensajeError(chatId, err);
  }
});


bot.onText(/\/pedidos/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const pedidos = await getPedidos();
    if (!pedidos.length) return bot.sendMessage(chatId, "📋 No hay pedidos registrados.");
    const texto = pedidos.map(p => `#${p.id} ${p.producto} x${p.cantidad} (${p.estado})`).join("\n");
    bot.sendMessage(chatId, `📋 Pedidos:\n${texto}`);
  } catch (err) { mensajeError(chatId, err); }
});

// ---------- CREAR PEDIDOS DESDE MENSAJE ----------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const texto = msg.text;

  if (texto.startsWith("/")) return;

  const partes = texto.split(",");
  const pedido = {};
  partes.forEach(p => {
    const [key, value] = p.split("=");
    if (key && value) pedido[key.trim()] = isNaN(value.trim()) ? value.trim() : Number(value.trim());
  });

  if (!pedido.producto || !pedido.cliente || !pedido.cantidad || pedido.cantidad <= 0)
    return bot.sendMessage(chatId, "❌ Formato inválido: cliente=Juan, producto=Broca, cantidad=5, proveedor=XYZ");

  try {
    const inventario = await getInventario();
    const item = inventario.find(i => i.producto.toLowerCase() === pedido.producto.toLowerCase());
    if (!item || item.cantidad < pedido.cantidad)
      return bot.sendMessage(chatId, `❌ Stock insuficiente de ${pedido.producto}. Disponible: ${item ? item.cantidad : 0}`);
    
    const data = await postPedido(pedido);
    bot.sendMessage(chatId, `✅ Pedido recibido: ${JSON.stringify(data.pedido)}`);
  } catch (err) { mensajeError(chatId, err); }
});
