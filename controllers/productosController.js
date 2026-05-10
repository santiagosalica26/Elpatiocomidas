const pool = require('../db');

// GET /api/productos
async function getProductos(req, res) {
    try {
        const result = await pool.query(`
            SELECT p.*, c.nombre AS categoria, c.emoji
            FROM productos p
            LEFT JOIN categorias c ON p.id_categoria = c.id
            ORDER BY c.nombre, p.nombre
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener productos.' });
    }
}

// GET /api/productos/:id
async function getProductoById(req, res) {
    try {
        const result = await pool.query(`
            SELECT p.*, c.nombre AS categoria, c.emoji
            FROM productos p
            LEFT JOIN categorias c ON p.id_categoria = c.id
            WHERE p.id = $1
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener el producto.' });
    }
}

// POST /api/productos  (solo admin)
async function createProducto(req, res) {
    const { nombre, descripcion, precio, stock, imagen_url, id_categoria } = req.body;

    if (!nombre || !precio) {
        return res.status(400).json({ error: 'Nombre y precio son obligatorios.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO productos (nombre, descripcion, precio, stock, imagen_url, id_categoria)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [nombre, descripcion, precio, stock || 10, imagen_url, id_categoria]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear el producto.' });
    }
}

// PUT /api/productos/:id  (solo admin)
async function updateProducto(req, res) {
    const { nombre, descripcion, precio, stock, imagen_url, disponible, id_categoria } = req.body;

    try {
        const result = await pool.query(
            `UPDATE productos
             SET nombre=$1, descripcion=$2, precio=$3, stock=$4,
                 imagen_url=$5, disponible=$6, id_categoria=$7
             WHERE id=$8
             RETURNING *`,
            [nombre, descripcion, precio, stock, imagen_url, disponible, id_categoria, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar el producto.' });
    }
}

// DELETE /api/productos/:id  (solo admin)
async function deleteProducto(req, res) {
    try {
        const result = await pool.query('DELETE FROM productos WHERE id=$1 RETURNING id', [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }
        res.json({ mensaje: 'Producto eliminado correctamente.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar el producto.' });
    }
}

module.exports = { getProductos, getProductoById, createProducto, updateProducto, deleteProducto };
