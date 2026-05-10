const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken, soloAdmin } = require('../middleware/auth');
const {
    getPedidos, getPedidoById, createPedido,
    updateEstadoPedido, confirmarEntrega, deletePedido
} = require('../controllers/pedidosController');

// Ruta pública — pedidos de mesa (sin JWT, desde QR)
router.post('/mesa', async (req, res) => {
    const { numero_mesa, nombre_cliente, items } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'El carrito está vacío.' });
    if (!numero_mesa) return res.status(400).json({ error: 'Número de mesa requerido.' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(
            'CALL registrar_pedido($1, $2, $3::json, $4, $5, $6, NULL)',
            [null, null, JSON.stringify(items), 'mesa', numero_mesa, nombre_cliente || 'Cliente']
        );
        const id_pedido = result.rows[0]?.p_id_pedido;
        const p = await client.query('SELECT total FROM pedidos WHERE id=$1', [id_pedido]);
        await client.query('COMMIT');
        res.status(201).json({ mensaje: 'Pedido enviado a cocina.', id_pedido, total: p.rows[0].total });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Ruta pública — consultar estado de pedido de mesa (sin JWT)
router.get('/estado/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT estado FROM pedidos WHERE id = $1',
            [req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Pedido no encontrado.' });
        res.json({ estado: result.rows[0].estado });
    } catch (err) {
        res.status(500).json({ error: 'Error al consultar estado.' });
    }
});

router.get('/',                       verificarToken, getPedidos);
router.get('/:id',                    verificarToken, getPedidoById);
router.post('/',                      verificarToken, createPedido);
router.put('/:id',                    verificarToken, soloAdmin, updateEstadoPedido);
router.post('/:id/confirmar-entrega', verificarToken, soloAdmin, confirmarEntrega);
router.delete('/:id',                 verificarToken, soloAdmin, deletePedido);

module.exports = router;