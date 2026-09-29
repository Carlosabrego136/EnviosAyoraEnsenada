// Lógica compartida para notificar a un cliente por WhatsApp cuando cambia el
// estado de su paquete. La usan tanto el botón manual "Notificar WhatsApp"
// como el envío automático que dispara el PATCH de /api/paquetes/[id] cuando
// el estado cambia.
const { query } = require('./db');
const { enviarWhatsApp, mensajePorEstado } = require('./whatsapp');

// Envía (o intenta enviar) la notificación de WhatsApp para el estado actual
// de un paquete, y siempre deja un registro en `notificaciones` (enviado o
// error) para tener rastro de qué se mandó y qué falló.
// Nunca lanza una excepción hacia quien la llama: regresa { ok, error? } para
// que el llamador decida qué hacer (por ejemplo, no tumbar un guardado exitoso
// del paquete solo porque el WhatsApp falló).
async function notificarCambioEstado(paqueteId) {
  const { rows } = await query(
    `SELECT p.*, cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono,
            pq.nombre AS paqueteria_nombre
     FROM paquetes p
     JOIN clientes cl ON cl.id = p.cliente_id
     LEFT JOIN paqueterias pq ON pq.id = p.paqueteria_id
     WHERE p.id = $1`,
    [paqueteId]
  );

  if (rows.length === 0) {
    return { ok: false, error: 'Paquete no encontrado' };
  }

  const paquete = rows[0];

  if (!paquete.cliente_telefono) {
    return { ok: false, error: 'Este cliente no tiene teléfono registrado para notificarle' };
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
    [paqueteId, paquete.cliente_telefono, mensaje]
  );
  const notificacion = notifRes.rows[0];

  try {
    await enviarWhatsApp(paquete.cliente_telefono, mensaje);
    await query(
      `UPDATE notificaciones SET estado_envio = 'enviado', enviado_en = now() WHERE id = $1`,
      [notificacion.id]
    );
    return { ok: true, mensaje };
  } catch (err) {
    const detalle = String(err.message || err);
    await query(
      `UPDATE notificaciones SET estado_envio = 'error', error_detalle = $2 WHERE id = $1`,
      [notificacion.id, detalle]
    );
    return { ok: false, error: 'No se pudo enviar el WhatsApp', detalle };
  }
}

module.exports = { notificarCambioEstado };
