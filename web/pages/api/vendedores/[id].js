const { query } = require('../../../lib/db');

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const { nombre, categoria_id, activo } = req.body;
    const { rows } = await query(
      `UPDATE vendedores
       SET nombre = COALESCE($1, nombre),
           categoria_id = CASE WHEN $2::text = '__null__' THEN NULL ELSE COALESCE($2::uuid, categoria_id) END,
           activo = COALESCE($3, activo)
       WHERE id = $4
       RETURNING *`,
      [nombre, categoria_id === null ? '__null__' : categoria_id, activo, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Vendedor no encontrado' });
    return res.status(200).json(rows[0]);
  }

  res.status(405).end();
}
