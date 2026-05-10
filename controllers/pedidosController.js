const pool = require('../db');

// GET /api/pedidos
async function getPedidos(req, res) {
    try {
        let query, params;
        if (req.usuario.rol === 'admin') {
            query = `
                SELECT p.*, u.nombre AS cliente, u.email
                FROM pedidos p
                LEFT JOIN usuarios u ON p.id_usuario = u.id
                ORDER BY p.fecha_pedido DESC
            `;
            params = [];
        } else {
            query = `SELECT * FROM pedidos WHERE id_usuario = $1 ORDER BY fecha_pedido DESC`;
            params = [req.usuario.id];
        }
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener pedidos.' });
    }
}

// GET /api/pedidos/:id
async function getPedidoById(req, res) {
    try {
        const pedido = await pool.query('SELECT * FROM pedidos WHERE id = $1', [req.params.id]);
        if (pedido.rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado.' });
        if (req.usuario.rol !== 'admin' && pedido.rows[0].id_usuario !== req.usuario.id) {
            return res.status(403).json({ error: 'No tenés acceso a este pedido.' });
        }
        const detalle = await pool.query(`
            SELECT dp.*, pr.nombre AS producto, pr.imagen_url
            FROM detalle_pedidos dp
            JOIN productos pr ON dp.id_producto = pr.id
            WHERE dp.id_pedido = $1
        `, [req.params.id]);
        res.json({ ...pedido.rows[0], detalle: detalle.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener el pedido.' });
    }
}

// POST /api/pedidos — Delivery con JWT
async function createPedido(req, res) {
    const { direccion_entrega, items } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'El carrito está vacío.' });
    if (!direccion_entrega) return res.status(400).json({ error: 'La dirección es requerida para delivery.' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(
            'CALL registrar_pedido($1, $2, $3::json, $4, $5, $6, NULL)',
            [req.usuario.id, direccion_entrega, JSON.stringify(items), 'delivery', null, null]
        );
        const id_pedido = result.rows[0]?.p_id_pedido;
        const p = await client.query('SELECT total FROM pedidos WHERE id=$1', [id_pedido]);
        await client.query('COMMIT');
        res.status(201).json({ mensaje: 'Pedido creado.', id_pedido, total: p.rows[0].total });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
}

// PUT /api/pedidos/:id — Cambiar estado (admin)
// Cuando pasa a 'en_camino' genera el código de entrega automáticamente
async function updateEstadoPedido(req, res) {
    const { estado, pagado } = req.body;
    const estadosValidos = ['pendiente', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'cancelado'];
    if (estado && !estadosValidos.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });

    try {
        // Si pasa a en_camino, generar código de 6 dígitos
        let codigoUpdate = '';
        if (estado === 'en_camino') {
            const codigo = Math.floor(100000 + Math.random() * 900000).toString();
            codigoUpdate = `, codigo_entrega = '${codigo}'`;
        }

        const sets = [];
        const vals = [];
        let idx = 1;
        if (estado) { sets.push(`estado = $${idx++}`); vals.push(estado); }
        if (pagado !== undefined) { sets.push(`pagado = $${idx++}`); vals.push(pagado); }
        sets.push(`fecha_actualizacion = NOW()`);
        if (estado === 'en_camino') sets.push(`codigo_entrega = $${idx++}`) && vals.push(Math.floor(100000 + Math.random() * 900000).toString());
        vals.push(req.params.id);

        const result = await pool.query(
            `UPDATE pedidos SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
            vals
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado.' });
        res.json({ mensaje: 'Pedido actualizado.', pedido: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar.' });
    }
}

// POST /api/pedidos/:id/confirmar-entrega — Admin ingresa código, se marca entregado y pagado
async function confirmarEntrega(req, res) {
    const { codigo } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM pedidos WHERE id = $1 AND codigo_entrega = $2',
            [req.params.id, codigo]
        );
        if (result.rows.length === 0) return res.status(400).json({ error: 'Código incorrecto.' });
        if (result.rows[0].estado === 'entregado') return res.status(400).json({ error: 'El pedido ya fue entregado.' });

        await pool.query(
            `UPDATE pedidos SET estado='entregado', pagado=TRUE, fecha_actualizacion=NOW() WHERE id=$1`,
            [req.params.id]
        );
        res.json({ mensaje: '✅ Pedido entregado y pagado.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al confirmar entrega.' });
    }
}

// DELETE /api/pedidos/:id
async function deletePedido(req, res) {
    try {
        const result = await pool.query('DELETE FROM pedidos WHERE id=$1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado.' });
        res.json({ mensaje: 'Pedido eliminado.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar el pedido.' });
    }
}

module.exports = { getPedidos, getPedidoById, createPedido, updateEstadoPedido, confirmarEntrega, deletePedido };