const { query } = require('../../../lib/db');

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const { nombre, telefono, categoria_id, activo } = req.body;
    const { rows } = await query(
      `UPDATE clientes
       SET nombre = COALESCE($1, nombre),
           telefono = CASE WHEN $2::text = '__null__' THEN NULL ELSE COALESCE($2::text, telefono) END,
           categoria_id = CASE WHEN $3::text = '__null__' THEN NULL ELSE COALESCE($3::uuid, categoria_id) END,
           activo = COALESCE($4, activo)
       WHERE id = $5
       RETURNING *`,
      [
        nombre,
        telefono === null ? '__null__' : telefono,
        categoria_id === null ? '__null__' : categoria_id,
        activo,
        id,
      ]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    return res.status(200).json(rows[0]);
  }

  res.status(405).end();
}
