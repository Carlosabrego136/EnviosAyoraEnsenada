// Genera la imagen PNG de un QR a partir del código que se le pase, SIN tocar
// la base de datos. Se usa en "Imprimir QR" (pages/admin/imprimir-qr.js) para
// poder cargar decenas de códigos QR de golpe sin abrir una conexión a la
// base de datos por cada uno — eso fue justo lo que saturó las conexiones de
// Aiven ("sorry, too many clients already") la primera vez que se probó esa
// pantalla con todos los vendedores y clientes a la vez.
//
// El endpoint /api/qr/[tipo]/[id] (que SÍ consulta la base de datos) se deja
// tal cual para la página individual /qr/[tipo]/[id], que solo carga un QR a
// la vez y no tiene este problema.
const QRCode = require('qrcode');

export default async function handler(req, res) {
  const { valor } = req.query;

  if (!valor || typeof valor !== 'string') {
    return res.status(400).json({ error: 'Falta el parámetro "valor" con el código a convertir en QR' });
  }

  const png = await QRCode.toBuffer(valor, { width: 400, margin: 2 });

  res.setHeader('Content-Type', 'image/png');
  // Estas imágenes no cambian para un mismo código, así que las dejamos
  // cachear en el navegador — ayuda a que "Imprimir QR" cargue más rápido
  // la segunda vez.
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  res.status(200).send(png);
}
