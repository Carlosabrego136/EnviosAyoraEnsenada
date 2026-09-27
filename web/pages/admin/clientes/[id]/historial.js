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
        `${i + 1}. ${formatearFecha(p.capturado_en)}${paqueteria}${guia} — Estado: ${
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

export default function HistorialCliente() {
  const router = useRouter();
  const { id } = router.query;
  const [cliente, setCliente] = useState(null);
  const [paquetes, setPaquetes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState(false);

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
                Enviar por WhatsApp
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Vendedor</th>
                    <th>Paquetería / Guía</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {paquetes.map((p) => (
                    <tr key={p.id}>
                      <td>{formatearFecha(p.capturado_en)}</td>
                      <td>{p.vendedor_nombre}</td>
                      <td>
                        {p.paqueteria_nombre || '—'} {p.numero_guia ? `(${p.numero_guia})` : ''}
                      </td>
                      <td>
                        <span className={`badge ${p.estado}`}>{ESTADO_LABEL[p.estado] || p.estado}</span>
                      </td>
                    </tr>
                  ))}
                  {paquetes.length === 0 && (
                    <tr>
                      <td colSpan={4}>Este cliente todavía no tiene paquetes registrados.</td>
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
