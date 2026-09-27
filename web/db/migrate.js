// Ejecuta el esquema schema.sql contra la base Aiven configurada en .env.local
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { pgConfig } = require('../lib/pg-connection');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL en .env.local');
    process.exit(1);
  }

  const pool = new Pool(pgConfig(process.env.DATABASE_URL));

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  console.log('Aplicando esquema a la base de datos...');
  await pool.query(sql);
  console.log('Listo. Tablas creadas/actualizadas correctamente.');
  await pool.end();
}

main().catch((err) => {
  console.error('Error al migrar:', err);
  process.exit(1);
});
