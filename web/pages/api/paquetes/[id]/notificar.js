const { notificarCambioEstado } = require('../../../../lib/notificaciones');

// Botón manual "Notificar WhatsApp" del panel — reenvía el mensaje del estado
// actual del paquete. Útil como respaldo si el envío automático falló o si el
// cliente cambió de número y quieren volver a mandarlo.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { id } = req.query;

  const resultado = await notificarCambioEstado(id);

  if (!resultado.ok) {
    let status = 502; // fallo al mandar el WhatsApp
    if (resultado.error === 'Paquete no encontrado') status = 404;
    else if (resultado.error === 'Este cliente no tiene teléfono registrado para notificarle') status = 400;
    return res.status(status).json({ error: resultado.error, detalle: resultado.detalle });
  }

  return res.status(200).json({ ok: true, mensaje: resultado.mensaje });
}
