# Sistema de Polleria

Sistema web para la gestion operativa de una polleria. Incluye punto de venta, ventas, pedidos, caja, inventario, compras, clientes, proveedores, promociones, CRM, reportes, usuarios, roles y logs de auditoria.

## Tecnologias

- Frontend: React 18, Vite, React Router, Axios, Zustand, Chart.js, Lucide React.
- Backend: Node.js, Express, Sequelize, MySQL, JWT, Multer, PDFKit, ExcelJS, Nodemailer.
- Base de datos: MySQL.

## Estructura del proyecto

```text
sistema-polleria/
|-- client/                 # Aplicacion React con Vite
|   |-- src/
|   |   |-- api/            # Configuracion de Axios
|   |   |-- components/     # Layout y componentes reutilizables
|   |   |-- pages/          # Pantallas del sistema
|   |   |-- routes/         # Rutas protegidas
|   |   `-- store/          # Estado global con Zustand
|   `-- vite.config.js      # Proxy hacia el backend
|-- server/                 # API REST con Express
|   |-- src/
|   |   |-- config/         # Conexion a MySQL
|   |   |-- controllers/    # Logica de negocio
|   |   |-- helpers/        # Utilidades
|   |   |-- middlewares/    # Autenticacion y roles
|   |   |-- models/         # Modelos Sequelize
|   |   |-- routes/         # Endpoints de la API
|   |   `-- services/       # Email e impresion
|   `-- uploads/            # Archivos subidos
|-- polleria_db.sql         # Script principal de base de datos
|-- bk_basededatos.sql      # Backup SQL
|-- caja_egresos.sql        # Script complementario
`-- LEER_ANTES_DE_INSTALAR.txt
```

## Requisitos

- Node.js 18 o superior.
- MySQL activo, por ejemplo con XAMPP, Laragon o MySQL Server.
- npm.

## Instalacion

1. Clonar o copiar el proyecto.

2. Instalar dependencias del backend:

```bash
cd server
npm install
```

3. Instalar dependencias del frontend:

```bash
cd ../client
npm install
```

4. Crear la base de datos en MySQL importando el archivo `polleria_db.sql`.

Ejemplo desde consola:

```bash
mysql -u root -p < polleria_db.sql
```

Si usas phpMyAdmin, crea/importa la base desde la opcion **Importar** y selecciona `polleria_db.sql`.

## Variables de entorno

Crear o revisar el archivo `server/.env` con una configuracion similar:

```env
PORT=3001

DB_HOST=localhost
DB_PORT=3306
DB_NAME=polleria_db
DB_USER=root
DB_PASSWORD=

JWT_SECRET=clave_segura_para_desarrollo
JWT_EXPIRES=24h
```

Para funciones de correo/CRM, configurar tambien credenciales SMTP si se van a utilizar:

```env
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## Ejecucion en desarrollo

Abrir dos terminales.

Backend:

```bash
cd server
npm run dev
```

El servidor se levanta en:

```text
http://localhost:3001
```

Frontend:

```bash
cd client
npm run dev
```

La aplicacion se abre en:

```text
http://localhost:5173
```

El frontend usa proxy para enviar `/api` y `/uploads` al backend en `http://localhost:3001`.

## Credenciales iniciales

Segun los scripts SQL incluidos:

```text
Administrador
Correo: admin@polleria.com
Clave: admin

Cajero demo
Correo: cajero@polleria.com
Clave: admin
```

## Modulos principales

- Dashboard administrativo.
- Punto de venta.
- Ventas y detalle de ventas.
- Pedidos.
- Productos y categorias.
- Inventario.
- Compras y proveedores.
- Clientes.
- Caja y egresos.
- Reportes.
- Promociones.
- CRM y perfil de cliente.
- Configuracion.
- Usuarios, roles y permisos.
- Logs de auditoria.

## Rutas principales del backend

```text
/api/auth
/api/productos
/api/categorias
/api/clientes
/api/proveedores
/api/ventas
/api/caja
/api/pedidos
/api/compras
/api/reportes
/api/usuarios
/api/configuracion
/api/logs
/api/promociones
/api/crm
/api/health
```

## Build de produccion

Frontend:

```bash
cd client
npm run build
```

Backend:

```bash
cd server
npm start
```

## Notas

- No subir `node_modules/` a un repositorio Git.
- No publicar valores reales de `server/.env`.
- Verificar que MySQL este iniciado antes de ejecutar el backend.
- Si el puerto `5173` o `3001` esta ocupado, cambiarlo en `client/vite.config.js` o `server/.env`.
