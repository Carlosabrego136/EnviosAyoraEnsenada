const { query } = require('../../../../lib/db');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { id } = req.query;

  const clienteRes = await query('SELECT * FROM clientes WHERE id = $1', [id]);
  if (clienteRes.rows.length === 0) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }

  const { rows } = await query(
    `SELECT p.*, v.nombre AS vendedor_nombre, pq.nombre AS paqueteria_nombre
     FROM paquetes p
     JOIN vendedores v ON v.id = p.vendedor_id
     LEFT JOIN paqueterias pq ON pq.id = p.paqueteria_id
     WHERE p.cliente_id = $1
     ORDER BY p.capturado_en DESC`,
    [id]
  );

  return res.status(200).json({ cliente: clienteRes.rows[0], paquetes: rows });
}
