import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';

const ESTADOS = ['recibido', 'en_transito', 'listo_entrega', 'entregado'];
const ESTADO_LABEL = {
  recibido: 'Recibido',
  en_transito: 'En tránsito',
  listo_entrega: 'Listo para entrega',
  entregado: 'Entregado',
};

export default function AdminPanel() {
  const [paquetes, setPaquetes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setCargando(true);
    const url = filtroCategoria ? `/api/paquetes?categoria=${filtroCategoria}` : '/api/paquetes';
    const [pRes, cRes] = await Promise.all([fetch(url), fetch('/api/categorias')]);
    setPaquetes(await pRes.json());
    setCategorias(await cRes.json());
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroCategoria]);

  async function cambiarEstado(id, estado) {
    await fetch(`/api/paquetes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    cargar();
  }

  async function notificar(id) {
    const res = await fetch(`/api/paquetes/${id}/notificar`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      alert('Error al notificar: ' + (data.error || 'desconocido'));
    } else {
      alert('Notificación enviada por WhatsApp ✅');
    }
  }

  const filtrados = paquetes.filter((p) => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      p.cliente_nombre?.toLowerCase().includes(q) ||
      p.vendedor_nombre?.toLowerCase().includes(q) ||
      p.numero_guia?.toLowerCase().includes(q)
    );
  });

  return (
    <Layout>
      <div className="card">
        <h2>Panel administrativo — Listado general</h2>
        <div className="grid-2">
          <div>
            <label>Buscar (cliente, vendedor o guía)</label>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Ej. Ayora, Karla..." />
          </div>
          <div>
            <label>Filtrar por categoría / bloque</label>
            <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
              <option value="">Todas (listado general)</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.clave}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {cargando ? (
          <p>Cargando...</p>
        ) : (
          <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Categoría</th>
                <th>Paquetería / Guía</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id}>
                  <td>{p.cliente_nombre}</td>
                  <td>{p.vendedor_nombre}</td>
                  <td>{p.categoria_nombre || '—'}</td>
                  <td>
                    {p.paqueteria_nombre || '—'} {p.numero_guia ? `(${p.numero_guia})` : ''}
                  </td>
                  <td>
                    <span className={`badge ${p.estado}`}>{ESTADO_LABEL[p.estado]}</span>
                  </td>
                  <td>
                    <select
                      value={p.estado}
                      onChange={(e) => cambiarEstado(p.id, e.target.value)}
                      style={{ marginBottom: 0, display: 'inline-block', width: 'auto' }}
                    >
                      {ESTADOS.map((e) => (
                        <option key={e} value={e}>
                          {ESTADO_LABEL[e]}
                        </option>
                      ))}
                    </select>{' '}
                    <button className="btn secondary" onClick={() => notificar(p.id)}>
                      Notificar WhatsApp
                    </button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6}>No hay paquetes que coincidan.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
