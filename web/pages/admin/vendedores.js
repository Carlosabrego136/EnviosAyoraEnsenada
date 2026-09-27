import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';

export default function Vendedores() {
  const [vendedores, setVendedores] = useState([]);
  const [nombre, setNombre] = useState('');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nombreEdicion, setNombreEdicion] = useState('');

  async function cargar() {
    const url = `/api/vendedores${mostrarInactivos ? '?incluirInactivos=1' : ''}`;
    const res = await fetch(url);
    setVendedores(await res.json());
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarInactivos]);

  async function crear(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    await fetch('/api/vendedores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre }),
    });
    setNombre('');
    cargar();
  }

  function iniciarEdicion(v) {
    setEditandoId(v.id);
    setNombreEdicion(v.nombre);
  }

  async function guardarEdicion(id) {
    if (!nombreEdicion.trim()) return;
    await fetch(`/api/vendedores/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombreEdicion }),
    });
    setEditandoId(null);
    cargar();
  }

  async function alternarActivo(v) {
    const accion = v.activo ? 'desactivar' : 'reactivar';
    if (!confirm(`¿Seguro que quieres ${accion} a "${v.nombre}"?`)) return;
    await fetch(`/api/vendedores/${v.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !v.activo }),
    });
    cargar();
  }

  return (
    <Layout>
      <div className="card">
        <h2>Vendedores</h2>
        <form onSubmit={crear} className="grid-2">
          <div>
            <label>Nombre del vendedor</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Magalli Renata" />
          </div>
          <div>
            <button className="btn" type="submit">Agregar vendedor</button>
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

        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Estado</th>
              <th>QR</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {vendedores.map((v) => (
              <tr key={v.id} style={{ opacity: v.activo ? 1 : 0.55 }}>
                <td>
                  {editandoId === v.id ? (
                    <input
                      value={nombreEdicion}
                      onChange={(e) => setNombreEdicion(e.target.value)}
                      style={{ marginBottom: 0 }}
                    />
                  ) : (
                    v.nombre
                  )}
                </td>
                <td>
                  <span className={`badge ${v.activo ? 'entregado' : 'recibido'}`}>
                    {v.activo ? 'Activo' : 'Desactivado'}
                  </span>
                </td>
                <td>
                  <a className="btn secondary" href={`/api/qr/vendedor/${v.id}`} target="_blank" rel="noreferrer">
                    Ver / imprimir QR
                  </a>
                </td>
                <td>
                  {editandoId === v.id ? (
                    <>
                      <button className="btn" onClick={() => guardarEdicion(v.id)}>Guardar</button>{' '}
                      <button className="btn secondary" onClick={() => setEditandoId(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button className="btn secondary" onClick={() => iniciarEdicion(v)}>Editar</button>{' '}
                      <button className="btn secondary" onClick={() => alternarActivo(v)}>
                        {v.activo ? 'Desactivar' : 'Reactivar'}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {vendedores.length === 0 && (
              <tr>
                <td colSpan={4}>No hay vendedores para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
