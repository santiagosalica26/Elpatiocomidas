# El Patio Comidas
### Sistema de pedidos full-stack — TP3 Programación III

> Aplicación web para bar/restaurante con soporte de **pedidos en mesa** y **delivery**, panel de administración completo y autenticación con JWT.

![Node.js]
![Express]
![PostgreSQL]

---

## Descripción

**El Patio Comidas** es una aplicación web completa que permite a los clientes realizar pedidos desde su mesa (escaneando un QR) o solicitar un delivery con seguimiento de estado en tiempo real. Los administradores cuentan con un panel dedicado para gestionar productos, pedidos y usuarios.

---

## Stack tecnológico

| Tecnología         | Versión |               Uso                 |
|                    |         |                                   |
| Node.js            | v18+    | Entorno de ejecución del servidor |
| Express            | 4.x     | Framework para rutas HTTP         |
| PostgreSQL         | 14+     | Base de datos relacional          |
| pg (node-postgres) | 8.x     | Conexión Node ↔ PostgreSQL        |
| jsonwebtoken       | 9.x     | Autenticación con JWT             |
| bcryptjs           | 2.x     | Hash seguro de contraseñas        |
| HTML + CSS + JS    | —       | Frontend vanilla sin frameworks   |
| dotenv             | 16.x    | Variables de entorno              |

---

## Estructura del proyecto

```
tp3-pedidos/
├── server.js                    # Punto de entrada del servidor
├── .env                         # Variables de entorno (NO subir a Git)
├── .env.example                 # Plantilla de variables de entorno
├── .gitignore
├── database.sql                 # Script completo de la base de datos
├── README.md
│
├── db/
│   └── index.js                 # Pool de conexión a PostgreSQL
│
├── controllers/
│   ├── authController.js        # Registro y login de usuarios
│   ├── productosController.js   # CRUD de productos
│   ├── pedidosController.js     # CRUD de pedidos + transacciones
│   └── adminController.js       # Estadísticas y gestión de usuarios
│
├── routes/
│   ├── auth.js                  # POST /api/auth/register y /login
│   ├── productos.js             # CRUD /api/productos
│   ├── pedidos.js               # CRUD /api/pedidos
│   └── admin.js                 # Rutas exclusivas de administrador
│
├── middleware/
│   └── auth.js                  # Verificación JWT + control de roles
│
└── public/
    ├── index.html               # Pantalla de login
    ├── register.html            # Registro de nuevos usuarios
    ├── menu.html                # Menú + carrito (delivery)
    ├── mesa.html                # Pedidos desde mesa (sin login)
    ├── mis-pedidos.html         # Historial de pedidos del cliente
    ├── admin.html               # Panel de administración
    ├── style.css                # Estilos globales 
    └── img/
        └── logo.png
```

---

## Instalación y puesta en marcha

### 1. Clonar el repositorio

```bash
git clone https://github.com/santiagosalica26/Elpatiocomidas.git
cd Elpatiocomidas
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copiá el archivo `.env.example` y renombralo a `.env`:

```bash
# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

Editá el `.env` con tus datos reales:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tp3_pedidos
DB_USER=postgres
DB_PASSWORD=tu_contraseña_de_postgresql
JWT_SECRET=una_frase_larga_y_secreta
```

>**Nunca subas el archivo `.env` a GitHub.** Ya está incluido en el `.gitignore`.

### 4. Crear la base de datos en PostgreSQL

Desde pgAdmin o psql, creá la base de datos:

```sql
CREATE DATABASE tp3_pedidos;
```

Luego ejecutá el script completo:

```bash
# Desde psql
psql -U postgres -d tp3_pedidos -f database.sql
```

O abrí `database.sql` en el Query Tool de pgAdmin y presioná **F5**.

### 5. Iniciar el servidor

```bash
node server.js
```

Si todo está bien, verás en la terminal:

```
🚀 Servidor corriendo en http://localhost:3000
✅ Conectado a PostgreSQL
```

Abrí el navegador en **http://localhost:3000**

---

## 👤 Usuarios de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Admin | admin@elpatio.com | admin123 |
| Cliente | Registrarse en `/register.html` | — |

---

## 🔌 Endpoints de la API

### Autenticación (pública)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Registro de nuevo usuario |
| POST | `/api/auth/login` | Login — devuelve JWT |

### Productos (requiere JWT)

| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/api/productos` | Listar todos los productos | Cliente / Admin |
| GET | `/api/productos/:id` | Obtener producto por ID | Cliente / Admin |
| POST | `/api/productos` | Crear nuevo producto | Solo Admin |
| PUT | `/api/productos/:id` | Actualizar producto | Solo Admin |
| DELETE | `/api/productos/:id` | Eliminar producto | Solo Admin |

### Pedidos (requiere JWT)

| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/api/pedidos` | Listar pedidos (admin: todos / cliente: los suyos) | Ambos |
| GET | `/api/pedidos/:id` | Obtener pedido con detalle | Ambos |
| POST | `/api/pedidos` | Crear pedido delivery | Cliente |
| POST | `/api/pedidos/mesa` | Crear pedido de mesa | Público (sin JWT) |
| PUT | `/api/pedidos/:id` | Actualizar estado y pago | Solo Admin |
| POST | `/api/pedidos/:id/confirmar-entrega` | Confirmar entrega con código | Solo Admin |
| DELETE | `/api/pedidos/:id` | Eliminar pedido | Solo Admin |

### Administración (requiere JWT + rol admin)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/admin/estadisticas` | Dashboard con métricas |
| GET | `/api/admin/usuarios` | Listar todos los usuarios |
| GET | `/api/admin/categorias` | Listar categorías |

---

## 🗄️ Base de datos

### Tablas

| Tabla | Descripción |
|---|---|
| `usuarios` | Clientes y administradores con control de roles |
| `categorias` | Agrupación del menú (Hamburguesas, Pizzas, etc.) |
| `productos` | Menú completo con precio, stock y disponibilidad |
| `pedidos` | Cabecera del pedido: tipo (mesa/delivery), estado, total |
| `detalle_pedidos` | Ítems individuales de cada pedido |

---

### Procedimiento Almacenado — `registrar_pedido`

```sql
CALL registrar_pedido(id_usuario, direccion, items::json, tipo, numero_mesa, nombre_cliente, NULL);
```

Recibe el usuario, la dirección, el tipo de pedido y los ítems en formato JSON. Internamente verifica que cada producto esté disponible y tenga stock suficiente, inserta la cabecera del pedido, luego el detalle ítem por ítem, descuenta el stock de cada producto y actualiza el total automáticamente. Si algún producto no tiene stock disponible, lanza una excepción que cancela toda la operación.

---

### Trigger — `trg_restaurar_stock`

```sql
AFTER UPDATE ON pedidos FOR EACH ROW
```

Se dispara automáticamente después de cada UPDATE en la tabla `pedidos`. Cuando detecta que el estado nuevo es `cancelado` y el anterior no lo era, recorre todos los ítems del detalle y devuelve la cantidad correspondiente al stock de cada producto. Esto mantiene la consistencia del inventario de forma completamente transparente, sin intervención de la aplicación.

---

### Transacción — Creación de pedido

Tanto en pedidos de **delivery** como de **mesa**, la creación utiliza una transacción explícita:

```javascript
await client.query('BEGIN');
// ... operaciones ...
await client.query('COMMIT');
// si algo falla:
await client.query('ROLLBACK');
```

Si cualquier operación falla durante el proceso (stock insuficiente, producto no disponible, error de base de datos), se ejecuta el `ROLLBACK` y **ningún cambio queda guardado**. Esto garantiza que nunca exista un pedido creado sin su detalle, ni stock descontado de forma incorrecta.

---

##  Preguntas conceptuales

**1. ¿Qué es un servidor web y cómo funciona el ciclo request-response?**

Un servidor web es un programa que escucha peticiones HTTP en un puerto determinado. El ciclo comienza cuando el cliente (navegador) envía un *request* con un método (GET, POST, etc.) y una ruta. El servidor lo recibe, ejecuta la lógica correspondiente (consultar la BD, validar datos) y devuelve un *response* con un código de estado (200, 404, 500) y el contenido solicitado. En este proyecto, Express actúa como el servidor que procesa cada request y devuelve JSON o HTML según la ruta.

**2. ¿Qué es Express y por qué lo usamos en lugar de usar solo Node.js?**

Express es un framework minimalista para Node.js que simplifica enormemente la creación de servidores HTTP. Con Node.js puro habría que manejar manualmente el parseo de URLs, métodos HTTP, bodies de requests y encabezados. Express abstrae todo eso y permite definir rutas de forma clara con `router.get()`, `router.post()`, agregar middlewares en cadena y organizar el código en módulos. El resultado es un código más limpio, mantenible y escalable.

**3. ¿Qué es un JWT y cómo se diferencia de guardar la sesión en el servidor?**

Un JWT (JSON Web Token) es un token firmado digitalmente que contiene información del usuario (id, email, rol) y se almacena en el cliente (localStorage). A diferencia de las sesiones tradicionales donde el servidor guarda el estado en memoria o base de datos y el cliente solo recibe un ID de sesión, con JWT el servidor no guarda nada: simplemente verifica la firma criptográfica del token en cada request. Esto hace el sistema stateless, más escalable y compatible con múltiples servidores.

**4. ¿Qué ventaja tiene usar un procedimiento almacenado en lugar de escribir ese SQL desde Node.js?**

El stored procedure encapsula lógica compleja directamente en la base de datos, lo que reduce la cantidad de queries individuales (y por ende los viajes de red entre app y BD), centraliza las reglas de negocio en un solo lugar y facilita el mantenimiento. Además, al ejecutarse dentro de PostgreSQL, puede manejar errores con excepciones nativas (`RAISE EXCEPTION`) y garantiza atomicidad sin necesidad de coordinarla desde la aplicación.

**5. ¿Por qué es importante usar transacciones? Ejemplo de ROLLBACK.**

Las transacciones garantizan que un conjunto de operaciones se ejecute de forma completa o no se ejecute ninguna. Ejemplo concreto: al crear un pedido con 3 productos, si el primero y segundo se insertan correctamente pero el tercero falla por falta de stock, el ROLLBACK deshace todo lo anterior. Sin transacción quedaría un pedido incompleto en la BD con stock incorrectamente descontado, rompiendo la integridad de los datos y generando inconsistencias difíciles de detectar.

**6. ¿Qué es un trigger? Describe el trigger implementado.**

Un trigger es una función que PostgreSQL ejecuta automáticamente cuando ocurre un evento específico (INSERT, UPDATE o DELETE) en una tabla, sin que la aplicación lo invoque explícitamente. El trigger implementado es `trg_restaurar_stock`: se ejecuta después de cada UPDATE en `pedidos`. Cuando detecta que el estado cambió a `cancelado`, recorre el detalle del pedido y devuelve el stock de cada producto afectado. Esto ocurre de forma completamente automática y transparente para la aplicación.

---

## Información de entrega

- **Repositorio:** https://github.com/santiagosalica26/Elpatiocomidas
- **Materia:** Programación III
- **Carrera:** Tecnicatura Superior en Programación
- **Trabajo Práctico:** N°3 — Aplicación Web Full-Stack con Node.js y PostgreSQL