const express = require('express');
const router = express.Router();
const { verificarToken, soloAdmin } = require('../middleware/auth');
const {
    getProductos, getProductoById,
    createProducto, updateProducto, deleteProducto
} = require('../controllers/productosController');

router.get('/',     verificarToken, getProductos);
router.get('/:id',  verificarToken, getProductoById);
router.post('/',    verificarToken, soloAdmin, createProducto);
router.put('/:id',  verificarToken, soloAdmin, updateProducto);
router.delete('/:id', verificarToken, soloAdmin, deleteProducto);

module.exports = router;
