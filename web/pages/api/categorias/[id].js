const { query } = require('../../../lib/db');

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const { clave, nombre } = req.body;
    try {
      const { rows } = await query(
        `UPDATE categorias
         SET clave = COALESCE($1, clave),
             nombre = COALESCE($2, nombre)
         WHERE id = $3
         RETURNING *`,
        [clave, nombre, id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Bloque no encontrado' });
      return res.status(200).json(rows[0]);
    } catch (err) {
      // 23505 = llave única duplicada (ya existe un bloque con esa clave)
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Ya existe un bloque con esa clave. Usa una diferente.' });
      }
      console.error(err);
      return res.status(500).json({ error: 'Error al actualizar el bloque' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { rows } = await query('DELETE FROM categorias WHERE id = $1 RETURNING id', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Bloque no encontrado' });
      return res.status(200).json({ ok: true });
    } catch (err) {
      // 23503 = violación de llave foránea (hay clientes/vendedores/paquetes usando este bloque)
      if (err.code === '23503') {
        return res.status(409).json({
          error: 'No se puede eliminar: hay clientes, vendedores o paquetes usando este bloque. Cámbialos de bloque primero.',
        });
      }
      console.error(err);
      return res.status(500).json({ error: 'Error al eliminar el bloque' });
    }
  }

  res.status(405).end();
}
