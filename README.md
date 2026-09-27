# ENVIOS AYORA — Sistema de captura por QR y seguimiento de paquetes

Sistema para automatizar la captura de paquetes (vendedor → cliente) usando
códigos QR, organizarlos por categoría/bloque (igual que las pestañas de tu
Excel), y notificar automáticamente a tus clientes por WhatsApp cuando su
paquete cambia de estado.

## ¿Qué incluye?

1. **`/web`** — La aplicación principal (Next.js):
   - Panel administrativo con listado general y por categoría (24.2, 24.3, ... 24.11).
   - Alta de vendedores y clientes, con generación de su código QR listo para imprimir.
   - Pantalla de escaneo: escaneas primero el QR del vendedor y luego el del
     cliente, y el sistema guarda el paquete automáticamente.
   - Registro de paquetería y número de guía (FedEx, DHL, Estafeta, Volaris,
     Paquete Expres, Bajapack).
   - Botón para notificar por WhatsApp al cliente según el estado del paquete.
   - Script para importar tu Excel actual (vendedores/clientes) de una sola vez.

2. **`/whatsapp-service`** — Microservicio aparte que mantiene la sesión de
   WhatsApp abierta (necesario porque Vercel, donde vive la app principal, no
   puede mantener procesos corriendo de forma permanente). Este servicio se
   despliega en un lugar que sí soporte procesos persistentes (Render,
   Railway, una VPS, o una PC dedicada).

## Puesta en marcha — paso a paso

### 1. Base de datos (Aiven)

1. Copia `web/.env.example` a `web/.env.local` y llena `DATABASE_URL` con el
   *Service URI* de tu servicio Aiven Postgres.
2. Instala dependencias y corre la migración:
   ```bash
   cd web
   npm install
   npm run db:migrate
   ```
   Esto crea todas las tablas necesarias.

### 2. Importar tu listado actual

Ya viene incluido un ejemplo con tu Excel (`web/db/ejemplo-listado-cliente.xlsx`).
Para importar cualquier Excel con el mismo formato (columna A = vendedor,
columna B = cliente, una pestaña por bloque):

```bash
cd web
npm run db:import -- "./db/ejemplo-listado-cliente.xlsx"
```

Esto crea automáticamente las categorías (General, 24.2, 24.3... 24.11), los
vendedores y los clientes, cada uno con su QR generado. Como te confirmó tu
cliente, la mayoría de vendedores van a cambiar — no hay problema, los nuevos
los das de alta desde el panel (`/admin/vendedores`) cuando quieras.

### 3. Levantar la app principal

```bash
cd web
npm run dev
```

Abre `http://localhost:3000`. Para producción, se despliega en Vercel con
subdominio (ej. `ayora.teocallipx7.com`) igual que tus otros proyectos.

### 4. Microservicio de WhatsApp

```bash
cd whatsapp-service
cp .env.example .env    # define SERVICE_TOKEN (debe ser igual al de web/.env.local)
npm install
npm start
```

La primera vez va a mostrar un **código QR en la terminal**: se escanea con
el WhatsApp Business secundario (el que confirmó el cliente) desde
*Dispositivos vinculados*. Después de eso queda conectado permanentemente
(la sesión se guarda en disco) y no hay que repetirlo, salvo que se
desvincule desde el celular.

**Importante:** este servicio necesita quedar corriendo 24/7 en algún lugar
con procesos persistentes (Render, Railway, VPS). No se puede meter en
Vercel porque las funciones ahí se apagan entre peticiones.

### 5. Conectar ambos

En `web/.env.local`, define:
```
WHATSAPP_SERVICE_URL=https://donde-quede-corriendo-el-servicio
WHATSAPP_SERVICE_TOKEN=el-mismo-token-que-pusiste-en-whatsapp-service/.env
```

## Flujo de uso diario

1. Se generan/imprimen los QR de vendedores y clientes una sola vez
   (`/admin/vendedores` y `/admin/clientes`).
2. Cuando llega un paquete: abres `/escanear` en el celular, escaneas el QR
   del vendedor y luego el del cliente (y opcionalmente capturas paquetería
   y guía). El sistema lo guarda solo, ya ordenado por cliente y categoría.
3. Desde `/admin` puedes ver todo el listado general o filtrar por bloque
   (24.2, 24.3, etc.), cambiar el estado del paquete y mandar la notificación
   de WhatsApp con un clic.

## Nota honesta sobre el rastreo de paqueterías

Ninguna de las paqueterías (FedEx, DHL, Estafeta, Volaris, Paquete Expres,
Bajapack) está conectada por API automática, porque el cliente no maneja
cuenta empresarial propia (usa guías colectivas). Por eso el estado del
paquete se actualiza manualmente desde el panel — el sistema sí guarda el
número de guía y, para FedEx/DHL/Estafeta, deja un enlace directo de rastreo
por si se quiere consultar. Si en el futuro el cliente consigue cuenta
empresarial con alguna paquetería, se puede conectar el rastreo automático
más adelante.
