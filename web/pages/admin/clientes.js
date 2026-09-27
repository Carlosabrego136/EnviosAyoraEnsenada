import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const [editandoId, setEditandoId] = useState(null);
  const [edicion, setEdicion] = useState({ nombre: '', telefono: '', categoria_id: '' });

  async function cargar() {
    const url = `/api/clientes${mostrarInactivos ? '?incluirInactivos=1' : ''}`;
    const [clRes, cRes] = await Promise.all([fetch(url), fetch('/api/categorias')]);
    setClientes(await clRes.json());
    setCategorias(await cRes.json());
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarInactivos]);

  async function crear(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, telefono: telefono || null, categoria_id: categoriaId || null }),
    });
    setNombre('');
    setTelefono('');
    setCategoriaId('');
    cargar();
  }

  function iniciarEdicion(c) {
    setEditandoId(c.id);
    setEdicion({ nombre: c.nombre, telefono: c.telefono || '', categoria_id: c.categoria_id || '' });
  }

  async function guardarEdicion(id) {
    if (!edicion.nombre.trim()) return;
    await fetch(`/api/clientes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: edicion.nombre,
        telefono: edicion.telefono.trim() === '' ? null : edicion.telefono.trim(),
        categoria_id: edicion.categoria_id === '' ? null : edicion.categoria_id,
      }),
    });
    setEditandoId(null);
    cargar();
  }

  async function alternarActivo(c) {
    const accion = c.activo ? 'desactivar' : 'reactivar';
    if (!confirm(`¿Seguro que quieres ${accion} a "${c.nombre}"?`)) return;
    await fetch(`/api/clientes/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !c.activo }),
    });
    cargar();
  }

  return (
    <Layout>
      <div className="card">
        <h2>Clientes</h2>
        <form onSubmit={crear} className="grid-2">
          <div>
            <label>Nombre del cliente</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Karla Gonzalez" />
          </div>
          <div>
            <label>WhatsApp del cliente (opcional, para notificarle)</label>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej. 6461234567" />
          </div>
          <div>
            <label>Categoría / bloque (opcional — ej. 24.2, 24.3...)</label>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              <option value="">-- General --</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <button className="btn" type="submit">Agregar cliente</button>
          </div>
        </form>
      </div>

      <div className="card">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <input
            type="checkbox"
            style={{ width: 'auto', margin: 0 }}
            checked={mostrarInactivos}
            onChange={(e) => setMostrarInactivos(e.target.checked)}
          />
          Mostrar también los desactivados
        </label>

        <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th>QR</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => {
              const enEdicion = editandoId === c.id;
              return (
                <tr key={c.id} style={{ opacity: c.activo ? 1 : 0.55 }}>
                  <td>
                    {enEdicion ? (
                      <input
                        value={edicion.nombre}
                        onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })}
                        style={{ marginBottom: 0 }}
                      />
                    ) : (
                      c.nombre
                    )}
                  </td>
                  <td>
                    {enEdicion ? (
                      <input
                        value={edicion.telefono}
                        onChange={(e) => setEdicion({ ...edicion, telefono: e.target.value })}
                        placeholder="Ej. 6461234567"
                        style={{ marginBottom: 0 }}
                      />
                    ) : (
                      c.telefono || '—'
                    )}
                  </td>
                  <td>
                    {enEdicion ? (
                      <select
                        value={edicion.categoria_id}
                        onChange={(e) => setEdicion({ ...edicion, categoria_id: e.target.value })}
                        style={{ marginBottom: 0 }}
                      >
                        <option value="">General</option>
                        {categorias.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                        ))}
                      </select>
                    ) : (
                      c.categoria_nombre || 'General'
                    )}
                  </td>
                  <td>
                    <span className={`badge ${c.activo ? 'entregado' : 'recibido'}`}>
                      {c.activo ? 'Activo' : 'Desactivado'}
                    </span>
                  </td>
                  <td>
                    <a className="btn secondary" href={`/api/qr/cliente/${c.id}`} target="_blank" rel="noreferrer">
                      Ver / imprimir QR
                    </a>
                  </td>
                  <td>
                    {enEdicion ? (
                      <>
                        <button className="btn" onClick={() => guardarEdicion(c.id)}>Guardar</button>{' '}
                        <button className="btn secondary" onClick={() => setEditandoId(null)}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button className="btn secondary" onClick={() => iniciarEdicion(c)}>Editar</button>{' '}
                        <button className="btn secondary" onClick={() => alternarActivo(c)}>
                          {c.activo ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={6}>No hay clientes para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </Layout>
  );
}
