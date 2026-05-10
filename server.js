require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globales ───────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Rutas API ──────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/pedidos',   require('./routes/pedidos'));
app.use('/api/admin',     require('./routes/admin'));

// ── Ruta raíz → sirve el frontend ─────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Manejo de rutas no encontradas ────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada.' });
});

// ── Iniciar servidor ───────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
