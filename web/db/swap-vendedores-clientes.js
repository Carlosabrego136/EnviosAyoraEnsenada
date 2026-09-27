// Corrige el error del Excel original: lo que se importó como "vendedores"
// en realidad eran los CLIENTES del negocio, y lo que se importó como
// "clientes" en realidad eran los VENDEDORES.
//
// Este script intercambia los datos entre las dos tablas (conservando
// nombre y categoría/bloque de cada quien) y genera códigos QR nuevos,
// porque los QR ya generados quedarían con el prefijo equivocado
// (VEND-/CLI-) si solo moviéramos las filas.
//
// Seguro de correr: como todavía no hay ningún paquete escaneado
// (tabla `paquetes` vacía), no hay referencias que se rompan.
//
// Uso:  node db/swap-vendedores-clientes.js

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const { pgConfig } = require('../lib/pg-connection');

const pool = new Pool(pgConfig(process.env.DATABASE_URL));

async function main() {
  const client = await pool.connect();
  try {
    const { rows: paquetesExistentes } = await client.query('SELECT COUNT(*) FROM paquetes');
    if (Number(paquetesExistentes[0].count) > 0) {
      console.error(
        `Ya existen ${paquetesExistentes[0].count} paquete(s) escaneado(s). ` +
          'Este script no está diseñado para correr con paquetes ya capturados ' +
          '(se perdería la relación vendedor/cliente correcta). Avísame antes de continuar.'
      );
      process.exit(1);
    }

    await client.query('BEGIN');

    const { rows: vendedoresActuales } = await client.query('SELECT nombre, categoria_id FROM vendedores');
    const { rows: clientesActuales } = await client.query(
      'SELECT nombre, telefono, categoria_id FROM clientes'
    );

    console.log(`Vendedores actuales (pasarán a ser clientes): ${vendedoresActuales.length}`);
    console.log(`Clientes actuales (pasarán a ser vendedores): ${clientesActuales.length}`);

    // Vaciamos ambas tablas (no hay paquetes que dependan de ellas todavía)
    await client.query('DELETE FROM vendedores');
    await client.query('DELETE FROM clientes');

    // Lo que eran "vendedores" ahora son clientes reales
    for (const v of vendedoresActuales) {
      const qr = `CLI-${nanoid(10)}`;
      await client.query(
        'INSERT INTO clientes (nombre, telefono, categoria_id, qr_codigo) VALUES ($1, NULL, $2, $3)',
        [v.nombre, v.categoria_id, qr]
      );
    }

    // Lo que eran "clientes" ahora son vendedores reales
    for (const c of clientesActuales) {
      const qr = `VEND-${nanoid(10)}`;
      await client.query('INSERT INTO vendedores (nombre, categoria_id, qr_codigo) VALUES ($1, $2, $3)', [
        c.nombre,
        c.categoria_id,
        qr,
      ]);
    }

    await client.query('COMMIT');
    console.log('Listo. Se intercambiaron correctamente vendedores y clientes, con QR nuevos.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error al intercambiar vendedores/clientes:', err);
  process.exit(1);
});
