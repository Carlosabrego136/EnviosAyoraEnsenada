// Conexión a la base de datos Aiven (Postgres)
const { Pool } = require('pg');
const { pgConfigServerless } = require('./pg-connection');

let pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'Falta DATABASE_URL en el archivo .env.local (ver .env.example y tus credenciales de Aiven).'
      );
    }
    pool = new Pool(pgConfigServerless(process.env.DATABASE_URL));
  }
  return pool;
}

// Cuando no queda ninguna conexión libre en la base, Postgres responde con el
// código 53300 ANTES de ejecutar la consulta, así que es seguro volver a
// intentar (aunque sea un INSERT o UPDATE: no se puede duplicar nada). Se
// reintenta unas veces con una pequeña espera.
const ESPERAS_REINTENTO_MS = [300, 700, 1300];

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function query(text, params) {
  const p = getPool();
  for (let intento = 0; ; intento += 1) {
    try {
      return await p.query(text, params);
    } catch (err) {
      if (!err || err.code !== '53300' || intento >= ESPERAS_REINTENTO_MS.length) throw err;
      await esperar(ESPERAS_REINTENTO_MS[intento] + Math.floor(Math.random() * 200));
    }
  }
}

module.exports = { getPool, query };
