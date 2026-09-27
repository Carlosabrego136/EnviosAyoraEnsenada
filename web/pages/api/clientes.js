const { query } = require('../../lib/db');
const { nanoid } = require('nanoid');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const incluirInactivos = req.query.incluirInactivos === '1';
    const { rows } = await query(
      `SELECT cl.*, c.nombre AS categoria_nombre
       FROM clientes cl
       LEFT JOIN categorias c ON c.id = cl.categoria_id
       ${incluirInactivos ? '' : 'WHERE cl.activo = true'}
       ORDER BY cl.nombre ASC`
    );
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { nombre, telefono, categoria_id } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
    const qr_codigo = `CLI-${nanoid(10)}`;
    const { rows } = await query(
      'INSERT INTO clientes (nombre, telefono, categoria_id, qr_codigo) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, telefono || null, categoria_id || null, qr_codigo]
    );
    return res.status(201).json(rows[0]);
  }

  res.status(405).end();
}
