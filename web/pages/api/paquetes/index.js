const { query } = require('../../../lib/db');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { categoria } = req.query;

    let sql = `
      SELECT p.*, v.nombre AS vendedor_nombre, cl.nombre AS cliente_nombre,
             cl.telefono AS cliente_telefono, cat.clave AS categoria_clave,
             cat.nombre AS categoria_nombre, pq.nombre AS paqueteria_nombre
      FROM paquetes p
      JOIN vendedores v ON v.id = p.vendedor_id
      JOIN clientes cl ON cl.id = p.cliente_id
      LEFT JOIN categorias cat ON cat.id = p.categoria_id
      LEFT JOIN paqueterias pq ON pq.id = p.paqueteria_id
    `;
    const params = [];

    if (categoria) {
      params.push(categoria);
      sql += ` WHERE cat.clave = $${params.length}`;
    }

    sql += ' ORDER BY cl.nombre ASC, p.capturado_en DESC';

    const { rows } = await query(sql, params);
    return res.status(200).json(rows);
  }

  if (req.method === 'DELETE') {
    // Vacía TODOS los paquetes (y sus notificaciones e historial de estado)
    // para empezar de cero, por ejemplo al iniciar una nueva semana. No toca
    // vendedores ni clientes.
    try {
      const { rows } = await query('SELECT COUNT(*) FROM paquetes');
      await query('DELETE FROM notificaciones');
      await query('DELETE FROM estado_historial');
      await query('DELETE FROM paquetes');
      return res.status(200).json({ ok: true, eliminados: Number(rows[0].count) });
    } catch (err) {
      console.error('Error al vaciar paquetes:', err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  }

  res.status(405).end();
}
