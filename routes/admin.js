const express = require('express');
const router = express.Router();
const { verificarToken, soloAdmin } = require('../middleware/auth');
const { getUsuarios, getEstadisticas, getCategorias } = require('../controllers/adminController');

router.get('/usuarios',      verificarToken, soloAdmin, getUsuarios);
router.get('/estadisticas',  verificarToken, soloAdmin, getEstadisticas);
router.get('/categorias',    verificarToken, soloAdmin, getCategorias);

module.exports = router;
