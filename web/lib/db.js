// Conexión a la base de datos Aiven (Postgres)
const { Pool } = require('pg');
const { pgConfig } = require('./pg-connection');

let pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'Falta DATABASE_URL en el archivo .env.local (ver .env.example y tus credenciales de Aiven).'
      );
    }
    pool = new Pool(pgConfig(process.env.DATABASE_URL));
  }
  return pool;
}

async function query(text, params) {
  const p = getPool();
  return p.query(text, params);
}

module.exports = { getPool, query };
