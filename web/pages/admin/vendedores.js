import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';

export default function Vendedores() {
  const [vendedores, setVendedores] = useState([]);
  const [nombre, setNombre] = useState('');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nombreEdicion, setNombreEdicion] = useState('');
  const [busqueda, setBusqueda] = useState('');

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

  const vendedoresFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return vendedores;
    return vendedores.filter((v) => v.nombre.toLowerCase().includes(q));
  }, [vendedores, busqueda]);

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
        <label>Buscar vendedor</label>
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
              <th>Estado</th>
              <th>QR</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {vendedoresFiltrados.map((v) => (
              <tr key={v.id} style={{ opacity: v.activo ? 1 : 0.55 }}>
                <td data-label="Nombre">
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
                <td data-label="Estado">
                  <span className={`badge ${v.activo ? 'entregado' : 'recibido'}`}>
                    {v.activo ? 'Activo' : 'Desactivado'}
                  </span>
                </td>
                <td data-label="QR">
                  <Link className="btn secondary" href={`/qr/vendedor/${v.id}`}>
                    Ver / imprimir QR
                  </Link>
                </td>
                <td data-label="Acciones">
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
            {vendedoresFiltrados.length === 0 && (
              <tr>
                <td colSpan={4}>No hay vendedores para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </Layout>
  );
}
