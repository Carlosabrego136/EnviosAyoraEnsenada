const { query } = require('../../../../lib/db');
const { enviarWhatsApp, mensajePorEstado } = require('../../../../lib/whatsapp');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { id } = req.query;

  const { rows } = await query(
    `SELECT p.*, cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono,
            pq.nombre AS paqueteria_nombre
     FROM paquetes p
     JOIN clientes cl ON cl.id = p.cliente_id
     LEFT JOIN paqueterias pq ON pq.id = p.paqueteria_id
     WHERE p.id = $1`,
    [id]
  );

  if (rows.length === 0) return res.status(404).json({ error: 'Paquete no encontrado' });
  const paquete = rows[0];

  if (!paquete.cliente_telefono) {
    return res.status(400).json({ error: 'Este cliente no tiene teléfono registrado para notificarle' });
  }

  const mensaje = mensajePorEstado(
    paquete.estado,
    paquete.cliente_nombre,
    paquete.paqueteria_nombre,
    paquete.numero_guia
  );

  const notifRes = await query(
    `INSERT INTO notificaciones (paquete_id, telefono_destino, mensaje, estado_envio)
     VALUES ($1, $2, $3, 'pendiente') RETURNING *`,
    [id, paquete.cliente_telefono, mensaje]
  );
  const notificacion = notifRes.rows[0];

  try {
    await enviarWhatsApp(paquete.cliente_telefono, mensaje);
    await query(
      `UPDATE notificaciones SET estado_envio = 'enviado', enviado_en = now() WHERE id = $1`,
      [notificacion.id]
    );
    return res.status(200).json({ ok: true, mensaje });
  } catch (err) {
    await query(
      `UPDATE notificaciones SET estado_envio = 'error', error_detalle = $2 WHERE id = $1`,
      [notificacion.id, String(err.message || err)]
    );
    return res.status(502).json({ error: 'No se pudo enviar el WhatsApp', detalle: String(err.message || err) });
  }
}
