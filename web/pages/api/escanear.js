// Recibe los dos QR escaneados (vendedor y cliente) y crea el registro del paquete.
const { query } = require('../../lib/db');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { vendedor_qr, cliente_qr, paqueteria_id, numero_guia } = req.body;

  if (!vendedor_qr || !cliente_qr) {
    return res.status(400).json({ error: 'Faltan los códigos QR de vendedor y/o cliente' });
  }

  if (vendedor_qr === cliente_qr) {
    return res.status(400).json({
      error: 'Escaneaste el mismo código dos veces. Escanea primero el QR del vendedor y luego el QR (distinto) del cliente.',
    });
  }
  if (!vendedor_qr.startsWith('VEND-')) {
    return res.status(400).json({ error: 'El primer código escaneado no es un código de VENDEDOR válido' });
  }
  if (!cliente_qr.startsWith('CLI-')) {
    return res.status(400).json({ error: 'El segundo código escaneado no es un código de CLIENTE válido' });
  }

  const vendedorRes = await query('SELECT * FROM vendedores WHERE qr_codigo = $1', [vendedor_qr]);
  const clienteRes = await query('SELECT * FROM clientes WHERE qr_codigo = $1', [cliente_qr]);

  if (vendedorRes.rows.length === 0) {
    return res.status(404).json({ error: 'QR de vendedor no reconocido' });
  }
  if (clienteRes.rows.length === 0) {
    return res.status(404).json({ error: 'QR de cliente no reconocido' });
  }

  const vendedor = vendedorRes.rows[0];
  const cliente = clienteRes.rows[0];

  const { rows } = await query(
    `INSERT INTO paquetes (vendedor_id, cliente_id, categoria_id, paqueteria_id, numero_guia, estado)
     VALUES ($1, $2, $3, $4, $5, 'recibido')
     RETURNING *`,
    [vendedor.id, cliente.id, cliente.categoria_id, paqueteria_id || null, numero_guia || null]
  );

  return res.status(201).json({
    paquete: rows[0],
    vendedor: vendedor.nombre,
    cliente: cliente.nombre,
  });
}
