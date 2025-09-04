const tablaPedidos = document.querySelector("#tablaPedidos tbody");
const tablaInventario = document.querySelector("#tablaInventario tbody");
const botonPedidos = document.querySelector("#cargarPedidos");

async function cargarDatos() {
  try {
    // Pedidos
    const pedidosRes = await fetch("http://localhost:3000/pedidos");
    const pedidosData = await pedidosRes.json();
    const pedidos = pedidosData.pedidos || pedidosData;

    // Inventario
    const stockRes = await fetch("http://localhost:3000/api/inventario");
    const inventario = await stockRes.json();

    // Limpiar tablas
    tablaPedidos.innerHTML = "";
    tablaInventario.innerHTML = "";

    // Mostrar pedidos
    pedidos.forEach(pedido => {
      const fila = document.createElement("tr");

      const itemStock = inventario.find(i => i.producto === pedido.producto);
      const cantidadStock = itemStock ? itemStock.cantidad : 0;

      fila.innerHTML = `
        <td>${pedido.id}</td>
        <td>${pedido.cliente}</td>
        <td>${pedido.producto}</td>
        <td>${pedido.cantidad}</td>
        <td>${pedido.proveedor}</td>
        <td>${new Date(pedido.fecha).toLocaleString()}</td>
        <td>
          ${pedido.estado}
          ${pedido.estado === "Pendiente" && cantidadStock >= pedido.cantidad ? `<button class="cambiarEstado" data-id="${pedido.id}">Enviar</button>` : ""}
        </td>
        <td>${cantidadStock}</td>
      `;
      tablaPedidos.appendChild(fila);
    });

    // Botones de estado
    document.querySelectorAll(".cambiarEstado").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        try {
          const res = await fetch(`http://localhost:3000/api/pedidos/${id}/estado`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado: "Enviado" })
          });
          const data = await res.json();
          alert(data.mensaje);
          cargarDatos(); // recarga todo
        } catch (err) {
          alert("Error al cambiar estado: " + err.message);
        }
      });
    });

    // Mostrar inventario
    inventario.forEach(item => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${item.producto}</td>
        <td>${item.cantidad}</td>
      `;
      tablaInventario.appendChild(fila);
    });

  } catch (err) {
    console.error("Error al cargar datos:", err);
  }
}
document.getElementById("btnHistorial").addEventListener("click", async () => {
  try {
    const res = await fetch("http://localhost:3000/api/historial");
    const data = await res.json();

    let html = "<h3>Historial de pedidos e inventario</h3><ul>";
    data.forEach(item => {
      html += `<li>${item.fecha} - ${item.accion} - ${item.detalle}</li>`;
    });
    html += "</ul>";

    document.getElementById("resultadoHistorial").innerHTML = html;
  } catch (err) {
    console.error("Error cargando historial:", err);
  }
});

document.getElementById("btnPDF").addEventListener("click", () => {
  window.open("http://localhost:3000/api/export/pdf", "_blank");
});

document.getElementById("btnExcel").addEventListener("click", () => {
  window.open("http://localhost:3000/api/export/excel", "_blank");
});

document.getElementById("btnWord").addEventListener("click", () => {
  window.open("http://localhost:3000/api/export/word", "_blank");
});

botonPedidos.addEventListener("click", cargarDatos);
cargarDatos(); // carga inicial automática
