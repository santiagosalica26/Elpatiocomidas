const express = require('express');
const router = express.Router();
const { verificarToken, soloAdmin } = require('../middleware/auth');
const {
    getProductos, getProductoById,
    createProducto, updateProducto, deleteProducto
} = require('../controllers/productosController');

// Ruta pública para mesas (sin JWT)
router.get('/publico', async (req, res) => {
    const pool = require('../db');
    try {
        const result = await pool.query(`
            SELECT p.*, c.nombre AS categoria, c.emoji
            FROM productos p
            LEFT JOIN categorias c ON p.id_categoria = c.id
            WHERE p.disponible = TRUE
            ORDER BY c.nombre, p.nombre
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener productos.' });
    }
});

router.get('/',     verificarToken, getProductos);
router.get('/:id',  verificarToken, getProductoById);
router.post('/',    verificarToken, soloAdmin, createProducto);
router.put('/:id',  verificarToken, soloAdmin, updateProducto);
router.delete('/:id', verificarToken, soloAdmin, deleteProducto);

module.exports = router;