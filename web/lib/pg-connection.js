// Aiven usa un certificado propio (no viene firmado por una autoridad pública
// estándar), y cuando el connection string trae "?sslmode=require" la
// librería `pg` a veces ignora la opción ssl explícita y valida el
// certificado de forma estricta, tronando con:
//   Error: self signed certificate in certificate chain
//
// Para evitarlo: quitamos el "sslmode" de la URL y forzamos nosotros mismos
// el objeto ssl con rejectUnauthorized:false (seguimos usando SSL, solo no
// exigimos que el certificado esté firmado por una CA pública).

function sanitizeConnectionString(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('sslmode');
    return parsed.toString();
  } catch (err) {
    // Si por alguna razón no se puede parsear como URL, la regresamos tal cual.
    return url;
  }
}

function pgConfig(connectionString) {
  return {
    connectionString: sanitizeConnectionString(connectionString),
    ssl: { rejectUnauthorized: false },
  };
}

// Configuración para la app en Vercel (lib/db.js). La base de Aiven solo
// permite 20 conexiones en total y las comparten varios sistemas (este, el de
// Vendedores y el de Rastreo). Cada instancia de Vercel crea su propio grupo
// de conexiones y, sin límite, `pg` abre hasta 10 por instancia, lo que llenaba
// las 20 y hacía fallar a todos con "too many clients already". Aquí cada
// instancia usa como máximo 1 y la suelta pronto. Los scripts de la carpeta
// db/ siguen usando pgConfig normal (sin estos límites).
function pgConfigServerless(connectionString) {
  return {
    ...pgConfig(connectionString),
    max: 1,
    idleTimeoutMillis: 2000,
    allowExitOnIdle: true,
    connectionTimeoutMillis: 12000, // máximo para conseguir conexión (incluye esperar turno)
  };
}

module.exports = { sanitizeConnectionString, pgConfig, pgConfigServerless };
