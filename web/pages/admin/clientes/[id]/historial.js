import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../../components/Layout';

const ESTADO_LABEL = {
  recibido: 'Recibido',
  en_transito: 'En tránsito',
  listo_entrega: 'Listo para entrega',
  entregado: 'Entregado',
};

function formatearFecha(fechaIso) {
  const f = new Date(fechaIso);
  return f.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Arma el texto listo para pegar en WhatsApp / Facebook con el historial del cliente.
function armarTextoResumen(cliente, paquetes) {
  const lineas = [];
  lineas.push(`📦 Historial de paquetes — ${cliente.nombre}`);
  lineas.push('');
  if (paquetes.length === 0) {
    lineas.push('No hay paquetes registrados todavía.');
  } else {
    paquetes.forEach((p, i) => {
      const guia = p.numero_guia ? ` — Guía: ${p.numero_guia}` : '';
      const paqueteria = p.paqueteria_nombre ? ` (${p.paqueteria_nombre})` : '';
      lineas.push(
        `${i + 1}. ${formatearFecha(p.capturado_en)} — Vendedor: ${p.vendedor_nombre}${paqueteria}${guia} — Estado: ${
          ESTADO_LABEL[p.estado] || p.estado
        }`
      );
    });
  }
  lineas.push('');
  lineas.push(`Total: ${paquetes.length} paquete(s).`);
  lineas.push('— ENVIOS AYORA');
  return lineas.join('\n');
}

function textoPaquete(cliente, p) {
  const guia = p.numero_guia ? ` — Guía: ${p.numero_guia}` : '';
  const paqueteria = p.paqueteria_nombre ? ` (${p.paqueteria_nombre})` : '';
  return `📦 ${cliente.nombre} — ${formatearFecha(p.capturado_en)} — Vendedor: ${p.vendedor_nombre}${paqueteria}${guia} — Estado: ${
    ESTADO_LABEL[p.estado] || p.estado
  }\n— ENVIOS AYORA`;
}

// Convierte una imagen guardada en base64 (data:image/jpeg;base64,...) a un archivo
// que se pueda adjuntar al compartir por WhatsApp/Facebook desde el celular.
function base64AArchivo(dataUrl, nombreArchivo) {
  const [encabezado, datos] = dataUrl.split(',');
  const tipo = encabezado.match(/data:(.*);base64/)[1];
  const binario = atob(datos);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new File([bytes], nombreArchivo, { type: tipo });
}

export default function HistorialCliente() {
  const router = useRouter();
  const { id } = router.query;
  const [cliente, setCliente] = useState(null);
  const [paquetes, setPaquetes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [puedeCompartirArchivos, setPuedeCompartirArchivos] = useState(false);

  useEffect(() => {
    if (!id) return;
    setCargando(true);
    fetch(`/api/clientes/${id}/paquetes`)
      .then((r) => r.json())
      .then((data) => {
        setCliente(data.cliente);
        setPaquetes(data.paquetes || []);
      })
      .finally(() => setCargando(false));
  }, [id]);

  useEffect(() => {
    setPuedeCompartirArchivos(
      typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'
    );
  }, []);

  async function copiarResumen() {
    if (!cliente) return;
    const texto = armarTextoResumen(cliente, paquetes);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch (err) {
      alert('No se pudo copiar automáticamente. Copia el texto de abajo manualmente.');
    }
  }

  function abrirWhatsApp() {
    if (!cliente) return;
    const texto = armarTextoResumen(cliente, paquetes);
    const telefono = (cliente.telefono || '').replace(/\D/g, '');
    const base = telefono ? `https://wa.me/52${telefono}` : 'https://wa.me/';
    window.open(`${base}?text=${encodeURIComponent(texto)}`, '_blank');
  }

  // Comparte el texto + TODAS las fotos disponibles usando el menú nativo del
  // celular (ahí se elige WhatsApp, Facebook, etc.) — esto es lo único que
  // permite mandar texto y foto juntos en un solo paso, ya que un link de
  // WhatsApp por sí solo no puede adjuntar imágenes automáticamente.
  async function compartirTodoConFotos() {
    if (!cliente) return;
    const conFoto = paquetes.filter((p) => p.foto);
    if (conFoto.length === 0) {
      alert('Ninguno de estos paquetes tiene foto guardada todavía.');
      return;
    }
    const archivos = conFoto.map((p, i) =>
      base64AArchivo(p.foto, `paquete-${i + 1}.jpg`)
    );
    const texto = armarTextoResumen(cliente, paquetes);

    // Respaldo: copiamos el texto completo al portapapeles ANTES de abrir el
    // menú de compartir. Algunas apps (como el inbox/Messenger de Facebook)
    // ignoran el texto cuando se comparten varias fotos a la vez y solo
    // muestran las imágenes — si eso pasa, el usuario ya tiene el texto
    // completo (con vendedor y todos los paquetes) listo para pegar como
    // descripción. En WhatsApp normalmente sí llega el texto junto con las
    // fotos, así que ahí no hace falta pegarlo.
    try {
      await navigator.clipboard.writeText(texto);
    } catch (err) {
      // si el portapapeles no está disponible, seguimos sin este respaldo
    }

    try {
      if (navigator.canShare && navigator.canShare({ files: archivos })) {
        await navigator.share({ text: texto, files: archivos });
      } else {
        alert(
          'Este navegador no permite compartir varias fotos a la vez. Puedes compartir la foto de cada paquete por separado, con el botón "Compartir foto" de cada uno.'
        );
      }
    } catch (err) {
      // el usuario canceló el compartir, no hacemos nada
    }
  }

  async function compartirPaquete(p) {
    if (!cliente) return;
    const texto = textoPaquete(cliente, p);
    try {
      await navigator.clipboard.writeText(texto);
    } catch (err) {
      // sin portapapeles disponible, seguimos sin este respaldo
    }
    try {
      if (p.foto) {
        const archivo = base64AArchivo(p.foto, 'paquete.jpg');
        if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
          await navigator.share({ text: texto, files: [archivo] });
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({ text: texto });
      } else {
        await navigator.clipboard.writeText(texto);
        alert('Se copió el texto de este paquete (tu navegador no permite compartir directo).');
      }
    } catch (err) {
      // cancelado por el usuario
    }
  }

  return (
    <Layout>
      <div className="card">
        <Link href="/admin/clientes" className="btn secondary" style={{ marginBottom: 14, display: 'inline-block' }}>
          ← Volver a Clientes
        </Link>

        {cargando && <p>Cargando...</p>}

        {!cargando && cliente && (
          <>
            <h2>Historial de {cliente.nombre}</h2>
            <p style={{ color: '#4b5563', fontSize: 14 }}>
              {cliente.telefono ? `WhatsApp: ${cliente.telefono}` : 'Sin WhatsApp registrado'} — {paquetes.length}{' '}
              paquete(s) en total
            </p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '14px 0' }}>
              <button className="btn" onClick={copiarResumen}>
                {copiado ? '¡Copiado!' : 'Copiar resumen'}
              </button>
              <button className="btn secondary" onClick={abrirWhatsApp}>
                Enviar por WhatsApp (solo texto)
              </button>
              {puedeCompartirArchivos && (
                <button className="btn secondary" onClick={compartirTodoConFotos}>
                  Compartir todo con fotos
                </button>
              )}
            </div>
            {!puedeCompartirArchivos && (
              <p style={{ fontSize: 12.5, color: '#6b7280', marginTop: -6, marginBottom: 14 }}>
                Para compartir texto y foto juntos en un solo paso, abre esta página desde el
                celular (funciona en Chrome de Android y Safari de iPhone).
              </p>
            )}
            {puedeCompartirArchivos && (
              <p style={{ fontSize: 12.5, color: '#6b7280', marginTop: -6, marginBottom: 14 }}>
                Al compartir con fotos, también copiamos el texto completo (con vendedor y todos los
                paquetes) al portapapeles. En WhatsApp normalmente llega junto con las fotos; en otras
                apps (como Messenger/inbox) a veces solo llegan las fotos — si eso pasa, pega el texto
                (mantén presionado y elige "Pegar") como descripción.
              </p>
            )}

            <div className="table-wrap">
              <table className="tabla-responsiva">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Vendedor</th>
                    <th>Paquetería / Guía</th>
                    <th>Estado</th>
                    <th>Foto</th>
                    <th>Compartir</th>
                  </tr>
                </thead>
                <tbody>
                  {paquetes.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Fecha">{formatearFecha(p.capturado_en)}</td>
                      <td data-label="Vendedor">{p.vendedor_nombre}</td>
                      <td data-label="Paquetería / Guía">
                        {p.paqueteria_nombre || '—'} {p.numero_guia ? `(${p.numero_guia})` : ''}
                      </td>
                      <td data-label="Estado">
                        <span className={`badge ${p.estado}`}>{ESTADO_LABEL[p.estado] || p.estado}</span>
                      </td>
                      <td data-label="Foto">
                        {p.foto ? (
                          <img
                            src={p.foto}
                            alt="Foto del paquete"
                            style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }}
                          />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td data-label="Compartir">
                        <button
                          className="btn secondary"
                          style={{ fontSize: 12, padding: '6px 10px' }}
                          onClick={() => compartirPaquete(p)}
                        >
                          Compartir
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paquetes.length === 0 && (
                    <tr>
                      <td colSpan={6}>Este cliente todavía no tiene paquetes registrados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!cargando && !cliente && <p>Cliente no encontrado.</p>}
      </div>
    </Layout>
  );
}
