const pool = require('../db');

async function getEstadisticas(req, res) {
    try {
        const [pedidos, clientes, productos, ingresos, mesa, delivery] = await Promise.all([
            pool.query("SELECT COUNT(*) FROM pedidos WHERE estado NOT IN ('entregado','cancelado')"),
            pool.query("SELECT COUNT(*) FROM usuarios WHERE rol='cliente'"),
            pool.query("SELECT COUNT(*) FROM productos WHERE disponible=TRUE"),
            pool.query("SELECT COALESCE(SUM(total),0) AS total FROM pedidos WHERE pagado=TRUE"),
            pool.query("SELECT COALESCE(SUM(total),0) AS total FROM pedidos WHERE pagado=TRUE AND tipo_pedido='mesa'"),
            pool.query("SELECT COALESCE(SUM(total),0) AS total FROM pedidos WHERE pagado=TRUE AND tipo_pedido='delivery'")
        ]);
        res.json({
            total_pedidos:    parseInt(pedidos.rows[0].count),
            total_clientes:   parseInt(clientes.rows[0].count),
            total_productos:  parseInt(productos.rows[0].count),
            ingresos_totales: parseFloat(ingresos.rows[0].total),
            ingresos_mesa:    parseFloat(mesa.rows[0].total),
            ingresos_delivery: parseFloat(delivery.rows[0].total)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener estadísticas.' });
    }
}

async function getUsuarios(req, res) {
    try {
        const result = await pool.query('SELECT id, nombre, email, rol, fecha_registro FROM usuarios ORDER BY fecha_registro DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener usuarios.' });
    }
}

async function getCategorias(req, res) {
    try {
        const result = await pool.query('SELECT * FROM categorias ORDER BY nombre');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener categorías.' });
    }
}

module.exports = { getEstadisticas, getUsuarios, getCategorias };
