// Genera la imagen PNG del QR para un vendedor o cliente, lista para imprimir.
const QRCode = require('qrcode');
const { query } = require('../../../../lib/db');

export default async function handler(req, res) {
  const { tipo, id } = req.query; // tipo: 'vendedor' | 'cliente'

  if (!['vendedor', 'cliente'].includes(tipo)) {
    return res.status(400).json({ error: 'tipo debe ser vendedor o cliente' });
  }

  const tabla = tipo === 'vendedor' ? 'vendedores' : 'clientes';
  const { rows } = await query(`SELECT * FROM ${tabla} WHERE id = $1`, [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'No encontrado' });

  const registro = rows[0];
  const png = await QRCode.toBuffer(registro.qr_codigo, { width: 400, margin: 2 });

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `inline; filename="qr-${tipo}-${registro.nombre}.png"`);
  res.status(200).send(png);
}
