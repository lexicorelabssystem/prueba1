# LexiCore Labs System 🛠️

Sistema de **Pedidos e Inventario** con integración de **Telegram Bot** y base de datos **PostgreSQL**.  
Este proyecto está diseñado para empresas mineras, logísticas o de suministros que necesitan automatizar pedidos, administrar inventarios y generar reportes descargables en **PDF, Excel y Word**.

---

## 📂 Estructura del proyecto

lexicorelabssystem/
│
├─ backend/
│   ├─ server.js
│   ├─ index.js
│   ├─ bot.js
│   ├─ db.js
│   ├─ package.json
│   ├─ package-lock.json
│   └─ .env        # NUNCA subir al repo
│
├─ frontend/
│   ├─ index.html
│   ├─ app.js
│   └─ style.css
│
|
├─ docs/
|   ├─ diagramas/
│   ├─ diagrama-flujo.png   # o .jpg (el que ya subiste)
│   └─ esquema-bd.png       # exportado desde esquema.sql si lo prefieres
|   |   
|   ├─ sql/
│   └─ esquema.sql          # definición de tablas
│
├─ .gitignore
└─ README.md