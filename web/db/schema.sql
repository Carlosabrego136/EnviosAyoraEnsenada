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
