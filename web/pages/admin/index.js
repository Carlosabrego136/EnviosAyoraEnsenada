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
  const [vaciando, setVaciando] = useState(false);

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

  async function eliminar(id, clienteNombre) {
    if (!confirm(`¿Seguro que quieres eliminar el paquete de "${clienteNombre}"? Esta acción no se puede deshacer.`))
      return;
    const res = await fetch(`/api/paquetes/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert('Error al eliminar: ' + (data.error || 'desconocido'));
      return;
    }
    cargar();
  }

  async function vaciarTodo() {
    if (paquetes.length === 0) {
      alert('No hay paquetes registrados por ahora.');
      return;
    }
    const confirmacion = prompt(
      `Vas a eliminar TODOS los paquetes registrados (${paquetes.length} en total), de todos los clientes. Esto NO afecta a tus vendedores ni clientes, solo la lista de paquetes.\n\nPara confirmar, escribe la palabra BORRAR (en mayúsculas):`
    );
    if (confirmacion !== 'BORRAR') {
      if (confirmacion !== null) alert('No escribiste "BORRAR" exactamente, así que no se eliminó nada.');
      return;
    }
    setVaciando(true);
    try {
      const res = await fetch('/api/paquetes', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert('Error al vaciar: ' + (data.error || 'desconocido'));
        return;
      }
      alert(`Listo, se eliminaron ${data.eliminados} paquete(s). Ya puedes empezar la semana de cero.`);
      cargar();
    } finally {
      setVaciando(false);
    }
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

        <button
          className="btn secondary"
          style={{ marginTop: 14, background: '#fee2e2', color: '#991b1b' }}
          onClick={vaciarTodo}
          disabled={vaciando}
        >
          {vaciando ? 'Vaciando...' : `Vaciar todos los paquetes (empezar semana nueva)`}
        </button>
        <p style={{ fontSize: 12.5, color: '#6b7280', marginTop: 6 }}>
          Borra de un jalón todos los paquetes registrados (de todos los clientes) para que puedas
          empezar la semana desde cero. No borra vendedores ni clientes. Te va a pedir que
          escribas "BORRAR" para confirmar, así nunca se elimina por accidente.
        </p>
      </div>

      <div className="card">
        {cargando ? (
          <p>Cargando...</p>
        ) : (
          <div className="table-wrap">
          <table className="tabla-responsiva">
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
                  <td data-label="Cliente">{p.cliente_nombre}</td>
                  <td data-label="Vendedor">{p.vendedor_nombre}</td>
                  <td data-label="Categoría">{p.categoria_nombre || '—'}</td>
                  <td data-label="Paquetería / Guía">
                    {p.paqueteria_nombre || '—'} {p.numero_guia ? `(${p.numero_guia})` : ''}
                  </td>
                  <td data-label="Estado">
                    <span className={`badge ${p.estado}`}>{ESTADO_LABEL[p.estado]}</span>
                  </td>
                  <td data-label="Acciones">
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
                    </button>{' '}
                    <button
                      className="btn secondary"
                      style={{ background: '#fee2e2', color: '#991b1b' }}
                      onClick={() => eliminar(p.id, p.cliente_nombre)}
                    >
                      Eliminar
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
