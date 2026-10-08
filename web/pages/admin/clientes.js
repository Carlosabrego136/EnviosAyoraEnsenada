import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [avisoCopiado, setAvisoCopiado] = useState('');

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

  async function eliminar(c) {
    if (!confirm(`¿Eliminar permanentemente a "${c.nombre}"? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/clientes/${c.id}`, { method: 'DELETE' });
    if (res.ok) {
      cargar();
      return;
    }
    const data = await res.json().catch(() => ({}));
    alert(data.error || 'No se pudo eliminar al cliente.');
  }

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q));
  }, [clientes, busqueda]);

  // Copia la lista de clientes que se está viendo en este momento (ya
  // filtrada por el buscador) como texto separado por tabulaciones, para
  // que al pegarlo en Excel cada dato caiga en su propia columna — mismo
  // botón que ya existe en Vendedores, pedido aquí para la lista de clientes.
  async function copiarParaExcel() {
    const encabezados = ['Nombre', 'Teléfono', 'Categoría', 'Estado'];

    const filas = clientesFiltrados.map((c) => [
      c.nombre || '',
      c.telefono || '',
      c.categoria_nombre || 'General',
      c.activo ? 'Activo' : 'Desactivado',
    ]);

    const texto = [encabezados, ...filas].map((fila) => fila.join('\t')).join('\n');

    let copiado = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
        copiado = true;
      }
    } catch (err) {
      copiado = false;
    }
    if (!copiado) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = texto;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        copiado = true;
      } catch (err) {
        copiado = false;
      }
    }

    setAvisoCopiado(
      copiado
        ? `Se copiaron ${filas.length} cliente${filas.length === 1 ? '' : 's'}. Ya puedes pegarlo en Excel (Ctrl/Cmd + V).`
        : 'No se pudo copiar automáticamente. Intenta de nuevo.'
    );
    setTimeout(() => setAvisoCopiado(''), 6000);
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <label style={{ marginBottom: 0 }}>Buscar cliente</label>
          <button className="btn secondary" style={{ fontSize: 12.5, padding: '6px 10px' }} onClick={copiarParaExcel}>
            📋 Copiar para Excel
          </button>
        </div>
        {avisoCopiado && (
          <p style={{ fontSize: 12.5, color: '#065f46', fontWeight: 600, marginTop: 4 }}>{avisoCopiado}</p>
        )}
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Escribe un nombre para filtrar..."
        />

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
        <table className="tabla-responsiva">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th>QR</th>
              <th>Historial</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((c) => {
              const enEdicion = editandoId === c.id;
              return (
                <tr key={c.id} style={{ opacity: c.activo ? 1 : 0.55 }}>
                  <td data-label="Nombre">
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
                  <td data-label="Teléfono">
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
                  <td data-label="Categoría">
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
                  <td data-label="Estado">
                    <span className={`badge ${c.activo ? 'entregado' : 'recibido'}`}>
                      {c.activo ? 'Activo' : 'Desactivado'}
                    </span>
                  </td>
                  <td data-label="QR">
                    <Link className="btn secondary" href={`/qr/cliente/${c.id}`}>
                      Ver / imprimir QR
                    </Link>
                  </td>
                  <td data-label="Historial">
                    <Link className="btn secondary" href={`/admin/clientes/${c.id}/historial`}>
                      Ver historial
                    </Link>
                  </td>
                  <td data-label="Acciones">
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
                        </button>{' '}
                        <button
                          className="btn secondary"
                          style={{ color: '#b91c1c' }}
                          onClick={() => eliminar(c)}
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {clientesFiltrados.length === 0 && (
              <tr>
                <td colSpan={7}>No hay clientes para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </Layout>
  );
}
