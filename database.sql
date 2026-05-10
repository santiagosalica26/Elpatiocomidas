-- ============================================================
-- El Patio Comidas — Base de datos completa
-- ============================================================

-- ============================================================
-- TABLAS
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin')),
    fecha_registro TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    emoji VARCHAR(10)
);

CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    stock INT DEFAULT 50 CHECK (stock >= 0),
    imagen_url VARCHAR(300),
    disponible BOOLEAN DEFAULT TRUE,
    id_categoria INT REFERENCES categorias(id)
);

CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    id_usuario INT REFERENCES usuarios(id),
    tipo_pedido VARCHAR(20) DEFAULT 'delivery' CHECK (tipo_pedido IN ('mesa', 'delivery')),
    numero_mesa INT,
    nombre_cliente VARCHAR(100),
    total NUMERIC(10,2) DEFAULT 0,
    estado VARCHAR(30) DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_preparacion','listo','en_camino','entregado','cancelado')),
    pagado BOOLEAN DEFAULT FALSE,
    direccion_entrega VARCHAR(300),
    codigo_entrega VARCHAR(6),
    fecha_pedido TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detalle_pedidos (
    id SERIAL PRIMARY KEY,
    id_pedido INT REFERENCES pedidos(id) ON DELETE CASCADE,
    id_producto INT REFERENCES productos(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL
);

-- ============================================================
-- STORED PROCEDURE: registrar_pedido
-- ============================================================

CREATE OR REPLACE PROCEDURE registrar_pedido(
    p_id_usuario INT,
    p_direccion VARCHAR,
    p_items JSON,
    p_tipo VARCHAR,
    p_numero_mesa INT,
    p_nombre_cliente VARCHAR,
    OUT p_id_pedido INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_item JSON;
    v_id_producto INT;
    v_cantidad INT;
    v_precio NUMERIC(10,2);
    v_stock INT;
    v_total NUMERIC(10,2) := 0;
    v_codigo VARCHAR(6);
BEGIN
    -- Generar código de entrega solo para delivery
    IF p_tipo = 'delivery' THEN
        v_codigo := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    END IF;

    INSERT INTO pedidos (id_usuario, direccion_entrega, tipo_pedido, numero_mesa, nombre_cliente, codigo_entrega)
    VALUES (p_id_usuario, p_direccion, p_tipo, p_numero_mesa, p_nombre_cliente, v_codigo)
    RETURNING id INTO p_id_pedido;

    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        v_id_producto := (v_item->>'id_producto')::INT;
        v_cantidad    := (v_item->>'cantidad')::INT;

        SELECT precio, stock INTO v_precio, v_stock
        FROM productos
        WHERE id = v_id_producto AND disponible = TRUE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto % no encontrado o no disponible', v_id_producto;
        END IF;

        IF v_stock < v_cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto %', v_id_producto;
        END IF;

        INSERT INTO detalle_pedidos (id_pedido, id_producto, cantidad, precio_unitario)
        VALUES (p_id_pedido, v_id_producto, v_cantidad, v_precio);

        UPDATE productos SET stock = stock - v_cantidad WHERE id = v_id_producto;

        v_total := v_total + (v_precio * v_cantidad);
    END LOOP;

    UPDATE pedidos SET total = v_total WHERE id = p_id_pedido;

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

-- ============================================================
-- TRIGGER: al cancelar un pedido, devuelve el stock
-- ============================================================

CREATE OR REPLACE FUNCTION fn_restaurar_stock_al_cancelar()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'cancelado' AND OLD.estado != 'cancelado' THEN
        UPDATE productos p
        SET stock = p.stock + dp.cantidad
        FROM detalle_pedidos dp
        WHERE dp.id_pedido = NEW.id
          AND dp.id_producto = p.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_restaurar_stock
AFTER UPDATE ON pedidos
FOR EACH ROW
EXECUTE FUNCTION fn_restaurar_stock_al_cancelar();

-- ============================================================
-- DATOS
-- ============================================================

INSERT INTO categorias (nombre, descripcion, emoji) VALUES
('Papas',        'Papas fritas con diferentes aderezos', '🍟'),
('Hamburguesas', 'Burgers artesanales El Patio',         '🍔'),
('Pizzas',       'Pizzas al horno',                      '🍕'),
('Bebidas',      'Frías y calientes',                    '🥤'),
('Postres',      'Para cerrar con dulzura',              '🍰')
ON CONFLICT DO NOTHING;

-- Admin (password: admin123)
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
('Administrador', 'admin@elpatio.com', '$2a$10$o9R6L9V6q2894tJQFq6s3eIkaBTrsjkZwG4ooD2c0svw9lpaVHVA6', 'admin')
ON CONFLICT DO NOTHING;

-- Papas
INSERT INTO productos (nombre, descripcion, precio, stock, id_categoria) VALUES
('Papas Clásicas',   'Papas con aderezo o solas',                     5000.00, 50, 1),
('Salchipapa',       'Papas y salchichas',                            6000.00, 50, 1),
('Papas Gratinadas', 'Papas y queso',                                 6500.00, 50, 1),
('Papas Cheddar',    'Papas con salsa cheddar',                       6800.00, 50, 1),
('Papas El Patio',   'Papas con cheddar, albóndigas y verdeo',        8500.00, 50, 1),
('Papas 1990',       'Papas con cheddar o gratinadas con salchichas', 7800.00, 50, 1)
ON CONFLICT DO NOTHING;

-- Hamburguesas
INSERT INTO productos (nombre, descripcion, precio, stock, id_categoria) VALUES
('Burger Clásica',       'Medallón de carne, tomate, cebolla, cheddar, mostaza y ketchup', 6000.00, 50, 2),
('Burger Cheese Simple', '1 medallón de carne, cheddar/tybo y aderezos',                   6500.00, 50, 2),
('Burger Cheese Doble',  '2 medallones de carne, cheddar/tybo y aderezos',                 7000.00, 50, 2),
('Burger Americana',     'Medallón de carne, BBQ, cebolla frita, cheddar',                 6000.00, 50, 2),
('Burger Italiana',      'Medallón de carne, queso gratinado, jamón, tomate, huevo',       6500.00, 50, 2),
('Burger El Patio',      'Medallón de carne, cheddar, panceta, huevo, papas',              8000.00, 50, 2)
ON CONFLICT DO NOTHING;

-- Pizzas
INSERT INTO productos (nombre, descripcion, precio, stock, id_categoria) VALUES
('Pizza Común',           'Salsa de tomate y mozzarella',             7000.00, 30, 3),
('Pizza Especial',        'Mozzarella con ingredientes especiales',    9000.00, 30, 3),
('Pizza Jamón y Huevo',   'Jamón y huevo sobre base de tomate',       9000.00, 30, 3),
('Pizza Jamón y Morrón',  'Jamón y morrón sobre base de tomate',      9000.00, 30, 3),
('Pizza Jamón',           'Jamón sobre base de tomate y mozzarella',  8000.00, 30, 3),
('Pizza Salame',          'Salame sobre base de tomate',              8000.00, 30, 3),
('Pizza Salame y Huevo',  'Salame y huevo',                           9000.00, 30, 3),
('Pizza Salame y Morrón', 'Salame y morrón',                          9000.00, 30, 3),
('Pizza Cheddar',         'Doble queso con cheddar',                 10000.00, 30, 3),
('Pizza Napolitana',      'Tomate, mozzarella, ajo y albahaca',      10000.00, 30, 3),
('Pizza El Patio',        'La especial de la casa',                  11000.00, 30, 3)
ON CONFLICT DO NOTHING;

-- Bebidas
INSERT INTO productos (nombre, descripcion, precio, stock, id_categoria) VALUES
('Coca Cola 500ml', 'Bebida gaseosa fría',      2000.00, 100, 4),
('Sprite 500ml',    'Gaseosa sin color fría',   2000.00, 100, 4),
('Fanta 500ml',     'Gaseosa naranja fría',     2000.00, 100, 4),
('Agua Mineral',    'Sin gas, 500ml',            1500.00, 100, 4),
('Agua con Gas',    'Con gas, 500ml',            1500.00, 100, 4),
('Jugo Natural',    'Del día, consultar sabor',  2500.00,  50, 4)
ON CONFLICT DO NOTHING;

-- Postres
INSERT INTO productos (nombre, descripcion, precio, stock, id_categoria) VALUES
('Brownie con Helado', 'Tibio, con helado de vainilla', 3500.00, 20, 5),
('Helado 2 bochas',    'A elección de sabores',         2500.00, 30, 5),
('Flan casero',        'Con crema y dulce de leche',    2000.00, 20, 5),
('Tiramisú',           'Clásico italiano de la casa',   3000.00, 15, 5)
ON CONFLICT DO NOTHING;
