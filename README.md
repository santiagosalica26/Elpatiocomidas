# 🍔 El Patio — Sistema de Pedidos de Comida

Aplicación web Full-Stack para gestionar pedidos de comida online.  
Desarrollada con **Node.js + Express + PostgreSQL**

---

## 🚀 Instalación y puesta en marcha

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd tp3-pedidos
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copiar el archivo de ejemplo y completar con tus datos:

```bash
cp .env.example .env
```

Editar `.env`:

```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tp3_pedidos
DB_USER=postgres
DB_PASSWORD=tu_contraseña
JWT_SECRET=una_clave_secreta_segura
```

### 4. Crear la base de datos

```bash
# Conectarse a PostgreSQL y crear la base
psql -U postgres -c "CREATE DATABASE tp3_pedidos;"

# Ejecutar el script completo
psql -U postgres -d tp3_pedidos -f database.sql
```

### 5. Iniciar el servidor

```bash
npm start
```

Abrir en el navegador: `http://localhost:3000`

**Usuario admin de prueba:**  
Email: `admin@pedidos.com` | Contraseña: `password`

---

## 📁 Estructura del proyecto

```
tp3-pedidos/
├── server.js               # Punto de entrada del servidor
├── .env                    # Variables de entorno (NO subir a Git)
├── .env.example            # Ejemplo de variables de entorno
├── database.sql            # Script completo de base de datos
├── db/
│   └── index.js            # Conexión al pool de PostgreSQL
├── controllers/
│   ├── authController.js   # Registro y login
│   ├── pedidosController.js
│   ├── productosController.js
│   └── adminController.js
├── routes/
│   ├── auth.js
│   ├── pedidos.js
│   ├── productos.js
│   └── admin.js
├── middleware/
│   └── auth.js             # Verificación JWT y control de roles
└── public/
    ├── index.html          # Login
    ├── register.html       # Registro
    ├── menu.html           # Menú + carrito (clientes)
    ├── mis-pedidos.html    # Historial de pedidos (clientes)
    ├── admin.html          # Panel de administración
    ├── app.js
    └── style.css
```

---

## 🗄️ Explicación de los elementos de base de datos

### Procedimiento Almacenado — `registrar_pedido`

**¿Qué hace?**  
Encapsula toda la lógica de creación de un pedido dentro de la base de datos:
1. Crea el registro en la tabla `pedidos`.
2. Por cada producto en el pedido, verifica que exista y esté disponible.
3. Verifica que haya stock suficiente; si no, lanza una excepción.
4. Inserta el detalle en `detalle_pedidos`.
5. Descuenta el stock del producto.
6. Calcula y actualiza el total del pedido.

Si cualquier paso falla, PostgreSQL lanza una excepción que hace que la transacción se revierta completamente.

**¿Cómo se llama desde la API?**  
En `controllers/pedidosController.js`, la función `createPedido` abre una transacción con `BEGIN`, llama al SP con `CALL registrar_pedido(...)` y hace `COMMIT`. Si el SP lanza una excepción, Node captura el error en el `catch`, ejecuta `ROLLBACK` y devuelve un HTTP 400 con el mensaje de error.

---

### Trigger — `trg_restaurar_stock`

**¿Qué hace?**  
Se dispara automáticamente **después de un `UPDATE` en la tabla `pedidos`**. Cuando el estado de un pedido cambia a `'cancelado'`, el trigger recorre los ítems del detalle y devuelve el stock a cada producto.

**¿Cuándo se activa?**  
Cada vez que un administrador cambia el estado de un pedido a `cancelado` (desde el panel admin). La base de datos restaura el stock sin que Node.js tenga que hacer nada extra.

---

### Transacción con ROLLBACK — `createPedido`

**¿Dónde está?**  
En `controllers/pedidosController.js`, función `createPedido`.

**¿Cómo funciona?**

```
BEGIN
  → CALL registrar_pedido(...)   ← si falla aquí...
COMMIT                           ← esto no se ejecuta
```

Si el SP detecta stock insuficiente o un producto no disponible, lanza una excepción. Node captura el error en el bloque `catch` y ejecuta `ROLLBACK`, dejando la base de datos exactamente como estaba antes. El cliente recibe un error HTTP 400 con el mensaje descriptivo.

---

## 📡 Endpoints de la API

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/register` | Registrar nuevo usuario | No |
| POST | `/api/auth/login` | Login, devuelve JWT | No |
| GET | `/api/productos` | Listar productos | JWT |
| GET | `/api/productos/:id` | Obtener producto por ID | JWT |
| POST | `/api/productos` | Crear producto | JWT + Admin |
| PUT | `/api/productos/:id` | Actualizar producto | JWT + Admin |
| DELETE | `/api/productos/:id` | Eliminar producto | JWT + Admin |
| GET | `/api/pedidos` | Listar pedidos (propios o todos si admin) | JWT |
| GET | `/api/pedidos/:id` | Detalle de un pedido | JWT |
| POST | `/api/pedidos` | Crear pedido (usa SP + transacción) | JWT |
| PUT | `/api/pedidos/:id` | Actualizar estado | JWT |
| DELETE | `/api/pedidos/:id` | Eliminar pedido | JWT + Admin |
| GET | `/api/admin/usuarios` | Listar usuarios | JWT + Admin |
| GET | `/api/admin/estadisticas` | Estadísticas del sistema | JWT + Admin |
| GET | `/api/admin/categorias` | Listar categorías | JWT + Admin |

---

## ❓ Preguntas Conceptuales

### 1. ¿Qué es un servidor web y cómo funciona el ciclo request-response?

Un servidor web es un programa que escucha conexiones en un puerto de red y responde a solicitudes HTTP. El ciclo empieza cuando el cliente (navegador) envía una request con un método (GET, POST, etc.) y una URL. El servidor recibe esa request, ejecuta la lógica correspondiente (consultar la base de datos, validar datos, etc.) y devuelve una response con un código de estado (200, 404, 500…) y un cuerpo (generalmente JSON o HTML). En este proyecto, Node.js escucha en el puerto 3000 y Express se encarga de enrutar cada request al controlador correcto.

### 2. ¿Qué es Express y por qué lo usamos en lugar de usar solo Node.js?

Express es un framework minimalista para Node.js que simplifica la creación de servidores HTTP. Con Node puro habría que parsear manualmente la URL, el método, el body y gestionar las respuestas desde cero. Express provee un sistema de rutas declarativo (`router.get(...)`, `router.post(...)`), soporte nativo para middlewares, manejo de JSON automático y utilidades para respuestas. Esto reduce código repetitivo y hace el proyecto mucho más legible y mantenible.

### 3. ¿Qué es un JWT y cómo se diferencia de guardar la sesión en el servidor?

Un JWT (JSON Web Token) es un token firmado que contiene información del usuario (id, email, rol) codificada en Base64. El servidor lo genera al hacer login y se lo entrega al cliente, que lo guarda en `localStorage` y lo envía en cada request. La diferencia con las sesiones tradicionales es que el servidor **no guarda estado**: verifica la firma del token con una clave secreta y, si es válida, extrae los datos del usuario sin consultar ninguna base de datos. Esto hace al sistema más escalable, ya que cualquier instancia del servidor puede verificar el token sin compartir memoria.

### 4. ¿Qué ventaja tiene usar un procedimiento almacenado en lugar de escribir ese SQL desde Node.js?

El SP centraliza la lógica de negocio dentro de la base de datos, lo que garantiza que se ejecute de forma atómica y consistente sin importar desde qué aplicación se llame. Además, reduce el tráfico entre la app y la BD (en lugar de múltiples queries, se hace una sola llamada), puede optimizarse con el planner de PostgreSQL, y si la lógica cambia solo hay que modificar el SP sin tocar el código de la aplicación. En este proyecto, `registrar_pedido` encapsula la verificación de stock, el alta del detalle y el cálculo del total en una sola operación.

### 5. ¿Por qué es importante usar transacciones? Ejemplo con ROLLBACK.

Las transacciones garantizan que un conjunto de operaciones se ejecute como una unidad indivisible: o todas tienen éxito o ninguna se aplica. Sin transacciones, si el servidor se cae entre el `INSERT` del pedido y el `UPDATE` del stock, quedaría un pedido sin descontar el stock, corrompiendo los datos. En este proyecto, si el SP detecta que un producto no tiene stock suficiente después de ya haber insertado el cabezal del pedido, lanza una excepción: Node captura el error, ejecuta `ROLLBACK` y la base de datos vuelve al estado anterior como si nada hubiera ocurrido.

### 6. ¿Qué es un trigger? Describí el que implementaste.

Un trigger es un bloque de código SQL que la base de datos ejecuta automáticamente en respuesta a un evento (INSERT, UPDATE o DELETE) sobre una tabla, sin que la aplicación lo invoque explícitamente. El trigger implementado es `trg_restaurar_stock`: se dispara **después de cada UPDATE en la tabla `pedidos`**. Cuando detecta que el estado nuevo es `'cancelado'` y el anterior no lo era, recorre todos los ítems del detalle de ese pedido y suma su cantidad de vuelta al stock de cada producto. Esto garantiza que cancelar un pedido siempre restaure el inventario, sin depender de que el código de Node lo recuerde.

---

## 🛠️ Tecnologías utilizadas

- **Node.js** v18+
- **Express** 4.x
- **PostgreSQL** 14+
- **pg** (node-postgres) 8.x
- **jsonwebtoken** 9.x
- **bcryptjs** 2.x
- **dotenv** 16.x
