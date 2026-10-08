const { query } = require('../../../lib/db');

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const { nombre, alias, categoria_id, activo } = req.body;
    // "" se trata igual que null (el formulario manda cadena vacía cuando
    // elige "Sin categoría"), si no Postgres truena al convertir "" a uuid.
    const categoriaIdParam = categoria_id === null || categoria_id === '' ? '__null__' : categoria_id;
    // El alias es opcional y se puede borrar a propósito (cadena vacía =
    // "quitar alias"), por eso se usa el mismo truco de centinela que la
    // categoría en vez de COALESCE (que nunca dejaría borrarlo).
    const aliasParam = alias === null || alias === '' ? '__null__' : alias;
    const { rows } = await query(
      `UPDATE vendedores
       SET nombre = COALESCE($1, nombre),
           alias = CASE WHEN $2::text = '__null__' THEN NULL ELSE COALESCE($2, alias) END,
           categoria_id = CASE WHEN $3::text = '__null__' THEN NULL ELSE COALESCE($3::uuid, categoria_id) END,
           activo = COALESCE($4, activo)
       WHERE id = $5
       RETURNING *`,
      [nombre, aliasParam, categoriaIdParam, activo, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Vendedor no encontrado' });
    return res.status(200).json(rows[0]);
  }

  if (req.method === 'DELETE') {
    try {
      const { rows } = await query('DELETE FROM vendedores WHERE id = $1 RETURNING id', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Vendedor no encontrado' });
      return res.status(200).json({ ok: true });
    } catch (err) {
      // 23503 = violación de llave foránea (el vendedor tiene paquetes registrados)
      if (err.code === '23503') {
        return res.status(409).json({
          error: 'No se puede eliminar: este vendedor tiene paquetes registrados en su historial. Puedes desactivarlo en su lugar.',
        });
      }
      console.error(err);
      return res.status(500).json({ error: 'Error al eliminar el vendedor' });
    }
  }

  res.status(405).end();
}
