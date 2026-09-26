// Importa el Excel de vendedores/clientes (formato del negocio: col A = vendedor, col B = cliente)
// a la base de datos, respetando las pestañas como categorías/bloques.
//
// Uso:  node db/import-excel.js "/ruta/al/archivo.xlsx"
//
// - La pestaña "ENVIO" y "LOCAL" se importan como categoría "general".
// - Las pestañas tipo "24.2", "24,4", "24.10" etc. se normalizan a una
//   categoría con esa clave (ej. "24.2") y nombre "Bloque 24.2".
// - Nombres duplicados de vendedor/cliente (misma persona repetida varias
//   veces en la hoja) se reutilizan en vez de crear registros duplicados.

require('dotenv').config({ path: '.env.local' });
const path = require('path');
const XLSX = require('xlsx');
const { Pool } = require('pg');
const { nanoid } = require('nanoid');

const archivo = process.argv[2];
if (!archivo) {
  console.error('Debes indicar la ruta del archivo .xlsx. Ej: node db/import-excel.js "./19 SEPTIEMBRE.xlsx"');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function normalizar(nombre) {
  return (nombre || '').toString().trim().replace(/\s+/g, ' ');
}

function claveCategoriaDeHoja(hoja) {
  const h = hoja.trim().toUpperCase();
  if (h === 'ENVIO' || h === 'LOCAL') return { clave: 'general', nombre: 'General' };
  // normaliza "24,4" -> "24.4"
  const limpio = h.replace(',', '.');
  return { clave: limpio.toLowerCase(), nombre: `Bloque ${limpio}` };
}

async function obtenerOCrearCategoria(cache, clave, nombre) {
  if (cache.has(clave)) return cache.get(clave);
  const { rows } = await pool.query(
    `INSERT INTO categorias (clave, nombre) VALUES ($1, $2)
     ON CONFLICT (clave) DO UPDATE SET nombre = EXCLUDED.nombre
     RETURNING *`,
    [clave, nombre]
  );
  cache.set(clave, rows[0]);
  return rows[0];
}

async function obtenerOCrearVendedor(cache, nombre, categoriaId) {
  const key = nombre.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const existente = await pool.query('SELECT * FROM vendedores WHERE lower(nombre) = $1 LIMIT 1', [key]);
  if (existente.rows.length > 0) {
    cache.set(key, existente.rows[0]);
    return existente.rows[0];
  }
  const qr = `VEND-${nanoid(10)}`;
  const { rows } = await pool.query(
    'INSERT INTO vendedores (nombre, categoria_id, qr_codigo) VALUES ($1, $2, $3) RETURNING *',
    [nombre, categoriaId, qr]
  );
  cache.set(key, rows[0]);
  return rows[0];
}

async function obtenerOCrearCliente(cache, nombre, categoriaId) {
  const key = nombre.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const existente = await pool.query('SELECT * FROM clientes WHERE lower(nombre) = $1 LIMIT 1', [key]);
  if (existente.rows.length > 0) {
    cache.set(key, existente.rows[0]);
    return existente.rows[0];
  }
  const qr = `CLI-${nanoid(10)}`;
  const { rows } = await pool.query(
    'INSERT INTO clientes (nombre, categoria_id, qr_codigo) VALUES ($1, $2, $3) RETURNING *',
    [nombre, categoriaId, qr]
  );
  cache.set(key, rows[0]);
  return rows[0];
}

async function main() {
  console.log(`Leyendo ${archivo} ...`);
  const wb = XLSX.readFile(path.resolve(archivo));

  const catCache = new Map();
  const vendCache = new Map();
  const cliCache = new Map();

  let totalVendedores = 0;
  let totalClientes = 0;
  let totalPares = 0;

  for (const hoja of wb.SheetNames) {
    const ws = wb.Sheets[hoja];
    const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    const { clave, nombre: nombreCat } = claveCategoriaDeHoja(hoja);
    const categoria = await obtenerOCrearCategoria(catCache, clave, nombreCat);

    for (const fila of filas) {
      const vendedorNombre = normalizar(fila[0]);
      const clienteNombre = normalizar(fila[1]);
      if (!vendedorNombre || !clienteNombre) continue;

      const vendedor = await obtenerOCrearVendedor(vendCache, vendedorNombre, categoria.id);
      const cliente = await obtenerOCrearCliente(cliCache, clienteNombre, categoria.id);

      totalVendedores = vendCache.size;
      totalClientes = cliCache.size;
      totalPares++;
    }

    console.log(`  Hoja "${hoja}" -> categoría "${categoria.nombre}" procesada.`);
  }

  console.log('----------------------------------------');
  console.log(`Vendedores únicos: ${totalVendedores}`);
  console.log(`Clientes únicos:   ${totalClientes}`);
  console.log(`Pares vendedor-cliente leídos: ${totalPares}`);
  console.log('Importación completada. Ahora puedes generar/imprimir los QR desde el panel.');

  await pool.end();
}

main().catch((err) => {
  console.error('Error al importar:', err);
  process.exit(1);
});
