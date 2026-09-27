const { query } = require('../../../lib/db');

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    // Primero borramos las notificaciones y el historial de estado ligados a
    // este paquete (si los hubiera), para no romper la relación en la base de datos.
    await query('DELETE FROM notificaciones WHERE paquete_id = $1', [id]);
    await query('DELETE FROM estado_historial WHERE paquete_id = $1', [id]);
    const { rows } = await query('DELETE FROM paquetes WHERE id = $1 RETURNING *', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Paquete no encontrado' });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'PATCH') {
    const { estado, numero_guia, paqueteria_id, notas } = req.body;
    const { rows } = await query(
      `UPDATE paquetes
       SET estado = COALESCE($1, estado),
           numero_guia = COALESCE($2, numero_guia),
           paqueteria_id = COALESCE($3, paqueteria_id),
           notas = COALESCE($4, notas)
       WHERE id = $5
       RETURNING *`,
      [estado, numero_guia, paqueteria_id, notas, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Paquete no encontrado' });

    // Si cambió el estado, lo agregamos al historial para la línea de tiempo pública.
    if (estado) {
      await query('INSERT INTO estado_historial (paquete_id, estado) VALUES ($1, $2)', [id, estado]);
    }

    return res.status(200).json(rows[0]);
  }

  res.status(405).end();
}
