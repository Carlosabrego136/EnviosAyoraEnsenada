-- ============================================================
-- Envíos Ayora Ensenada — Esquema de base de datos (Aiven Postgres)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Categorías / bloques (equivalen a las pestañas del Excel: General, 24.2, 24.3 ... 24.11)
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT UNIQUE NOT NULL,         -- 'general', '24.2', '24.3', ...
  nombre TEXT NOT NULL,               -- 'General', 'Bloque 24.2', ...
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vendedores (quien entrega el paquete)
CREATE TABLE IF NOT EXISTS vendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  categoria_id UUID REFERENCES categorias(id),
  qr_codigo TEXT UNIQUE NOT NULL,     -- valor codificado en el QR (ej. VEND-xxxxx)
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clientes (quien recibe el paquete / a quien se le notifica)
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  telefono TEXT,                      -- WhatsApp del cliente para notificarle, si se tiene
  categoria_id UUID REFERENCES categorias(id),
  qr_codigo TEXT UNIQUE NOT NULL,     -- valor codificado en el QR (ej. CLI-xxxxx)
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendedores_nombre ON vendedores (lower(nombre));
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes (lower(nombre));

-- Paqueterías soportadas
CREATE TABLE IF NOT EXISTS paqueterias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT UNIQUE NOT NULL,        -- FedEx, DHL, Estafeta, Volaris, Paquete Expres, Bajapack
  rastreo_automatico BOOLEAN NOT NULL DEFAULT false, -- true solo si algún día se conecta API real
  url_rastreo_manual TEXT             -- plantilla de URL para consultar guía manualmente
);

-- IMPORTANTE sobre url_rastreo_manual: cuando la plantilla trae "{guia}" quiere
-- decir que esa paquetería SÍ deja mandar a alguien directo al resultado de su
-- rastreo (confirmado probando con guías reales). Las que no traen "{guia}" en
-- la plantilla es porque se probó y su sitio NO permite precargar la guía por
-- URL (Estafeta y Bajapack cambiaron de sitio; Volaris nunca lo permitió) — para
-- esas, el botón de "Imprimir QR"/rastreo copia el número de guía y abre la
-- página en blanco (ver BOTON_PAQUETERIA en pages/index.js del repo Rastreo).
INSERT INTO paqueterias (nombre, rastreo_automatico, url_rastreo_manual) VALUES
  ('FedEx', false, 'https://www.fedex.com/fedextrack/?trknbr={guia}'),
  ('DHL', false, 'https://www.dhl.com/mx-es/home/tracking.html?tracking-id={guia}'),
  ('Paquete Expres', false, 'https://www.paquetexpress.com.mx/rastreo/{guia}'),
  ('Estafeta', false, 'https://www.estafeta.com/rastrear-envio'),
  ('Bajapack', false, 'https://bajapack.com/rastrear/'),
  ('Volaris', false, 'https://volarisy4.smartkargo.com/FrmAWBTracking.aspx')
ON CONFLICT (nombre) DO UPDATE SET
  rastreo_automatico = EXCLUDED.rastreo_automatico,
  url_rastreo_manual = EXCLUDED.url_rastreo_manual;

-- Registro de cada paquete capturado (escaneo vendedor -> cliente)
CREATE TABLE IF NOT EXISTS paquetes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES vendedores(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  categoria_id UUID REFERENCES categorias(id),  -- se hereda del cliente al capturar
  paqueteria_id UUID REFERENCES paqueterias(id),
  numero_guia TEXT,
  estado TEXT NOT NULL DEFAULT 'recibido',  -- recibido | en_transito | listo_entrega | entregado
  notas TEXT,
  capturado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foto del paquete al momento de recibirlo (guardada como imagen en base64).
-- Se agrega con ALTER porque la tabla paquetes puede ya existir de antes.
ALTER TABLE paquetes ADD COLUMN IF NOT EXISTS foto TEXT;

CREATE INDEX IF NOT EXISTS idx_paquetes_categoria ON paquetes (categoria_id);
CREATE INDEX IF NOT EXISTS idx_paquetes_estado ON paquetes (estado);
CREATE INDEX IF NOT EXISTS idx_paquetes_capturado_en ON paquetes (capturado_en);

-- Historial de cada cambio de estado de un paquete (para la línea de tiempo
-- que ve el cliente en la página pública de rastreo).
CREATE TABLE IF NOT EXISTS estado_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paquete_id UUID NOT NULL REFERENCES paquetes(id),
  estado TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_estado_historial_paquete ON estado_historial (paquete_id);

-- Historial de notificaciones de WhatsApp enviadas por paquete
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paquete_id UUID NOT NULL REFERENCES paquetes(id),
  telefono_destino TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  estado_envio TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | enviado | error
  error_detalle TEXT,
  enviado_en TIMESTAMPTZ
);

-- Trigger simple para mantener actualizado_en al día en paquetes
CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_paquetes_actualizado ON paquetes;
CREATE TRIGGER trg_paquetes_actualizado
BEFORE UPDATE ON paquetes
FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- ============================================================
-- Ficha extendida de vendedores (pedida por la clienta para el
-- proyecto separado "Vendedores"). Se agrega con ALTER porque la
-- tabla vendedores ya existe desde antes. Estos campos NO se
-- muestran en el panel administrativo general (pages/admin/vendedores.js
-- del proyecto principal no los toca ni los lee) — solo los usa el
-- proyecto separado envios-ayora-vendedores.
-- ============================================================
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS referencia1_nombre TEXT;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS referencia1_telefono TEXT;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS referencia2_nombre TEXT;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS referencia2_telefono TEXT;
-- Foto de la INE guardada como imagen en base64 (comprimida del lado del
-- navegador antes de subirla), igual que ya se hace con la foto de los
-- paquetes — sin necesidad de contratar ni mantener otro servicio aparte.
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS ine_foto TEXT;
-- Estatus ampliado del vendedor (independiente del booleano "activo" que ya
-- usa el panel general — ese sigue funcionando igual, sin tocarse).
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS estatus TEXT NOT NULL DEFAULT 'activo';
ALTER TABLE vendedores DROP CONSTRAINT IF EXISTS vendedores_estatus_check;
ALTER TABLE vendedores ADD CONSTRAINT vendedores_estatus_check
  CHECK (estatus IN ('activo', 'inactivo', 'alerta_riesgo', 'vetado'));

-- Si ya existían vendedores antes de este cambio, les damos una fecha de
-- ingreso/vencimiento razonable en vez de dejarlos en blanco.
UPDATE vendedores SET fecha_vencimiento = (fecha_ingreso + INTERVAL '1 year')::date
WHERE fecha_vencimiento IS NULL;

-- Asistencia del vendedor al "pase de lista" de los viernes (día en que se
-- reciben los paquetes). Un renglón por vendedor por fecha escaneada.
CREATE TABLE IF NOT EXISTS asistencias_vendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vendedor_id, fecha)
);
CREATE INDEX IF NOT EXISTS idx_asistencias_vendedor ON asistencias_vendedores (vendedor_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha ON asistencias_vendedores (fecha);

-- Número de registro consecutivo del vendedor (para su tarjeta de
-- identificación). Empieza en 1 y se muestra con 4 dígitos (0001, 0002...).
-- Se asigna solo, automáticamente, al dar de alta a cada vendedor nuevo.
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS numero_registro INTEGER;
-- Si ya había vendedores antes de este cambio, se les asigna un número
-- consecutivo según el orden en que se dieron de alta, para no dejarlos sin
-- número.
WITH numerados AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY creado_en ASC) AS n
  FROM vendedores
  WHERE numero_registro IS NULL
)
UPDATE vendedores v
SET numero_registro = numerados.n
FROM numerados
WHERE v.id = numerados.id;
ALTER TABLE vendedores DROP CONSTRAINT IF EXISTS vendedores_numero_registro_unico;
ALTER TABLE vendedores ADD CONSTRAINT vendedores_numero_registro_unico UNIQUE (numero_registro);

-- ============================================================
-- Registro de clientes (sección nueva del panel administrativo para
-- capturar los datos de un envío/cliente y poder mandarlos por WhatsApp
-- con un mensaje ya formateado). Es independiente de la tabla "clientes"
-- (esa sigue usándose para el QR y el rastreo de paquetes) — esta es solo
-- para guardar estos datos puntuales que pidió la clienta.
-- ============================================================
CREATE TABLE IF NOT EXISTS registros_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  telefono TEXT,
  domicilio TEXT,
  facebook TEXT,
  referencia TEXT,
  paqueteria TEXT,
  numero_cajas INTEGER,
  kilos NUMERIC(10,2),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_registros_clientes_nombre ON registros_clientes (lower(nombre));
CREATE INDEX IF NOT EXISTS idx_registros_clientes_creado ON registros_clientes (creado_en);
