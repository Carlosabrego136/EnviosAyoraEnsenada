// Cliente HTTP hacia el microservicio de WhatsApp (ver carpeta /whatsapp-service).
// El servicio de WhatsApp corre aparte (no en Vercel) porque necesita mantener
// una sesión de navegador abierta todo el tiempo, algo que las funciones
// serverless de Vercel no permiten.

async function enviarWhatsApp(telefono, mensaje) {
  const url = process.env.WHATSAPP_SERVICE_URL;
  const token = process.env.WHATSAPP_SERVICE_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Falta configurar WHATSAPP_SERVICE_URL / WHATSAPP_SERVICE_TOKEN en .env.local'
    );
  }

  const res = await fetch(`${url}/enviar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ telefono, mensaje }),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    throw new Error(`Error del servicio de WhatsApp (${res.status}): ${detalle}`);
  }

  return res.json();
}

function mensajePorEstado(estado, nombreCliente, paqueteria, guia) {
  const guiaTxt = guia ? ` (guía: ${guia}${paqueteria ? ' - ' + paqueteria : ''})` : '';
  switch (estado) {
    case 'recibido':
      return `Hola ${nombreCliente} 👋, te confirmamos que recibimos tu paquete${guiaTxt}. Te avisaremos cuando esté listo para entrega.`;
    case 'en_transito':
      return `Hola ${nombreCliente}, tu paquete${guiaTxt} ya va en camino. Te seguiremos informando.`;
    case 'listo_entrega':
      return `Hola ${nombreCliente} 📦, tu paquete${guiaTxt} ya está listo para entrega/recolección.`;
    case 'entregado':
      return `Hola ${nombreCliente}, tu paquete${guiaTxt} fue entregado. ¡Gracias por tu compra! 🙌`;
    default:
      return `Hola ${nombreCliente}, hay una actualización de tu paquete${guiaTxt}: ${estado}.`;
  }
}

module.exports = { enviarWhatsApp, mensajePorEstado };
