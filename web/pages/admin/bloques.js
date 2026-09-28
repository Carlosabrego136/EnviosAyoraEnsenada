import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';

export default function Bloques() {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [clave, setClave] = useState('');
  const [nombre, setNombre] = useState('');

  const [editandoId, setEditandoId] = useState(null);
  const [edicion, setEdicion] = useState({ clave: '', nombre: '' });

  async function cargar() {
    setCargando(true);
    const res = await fetch('/api/categorias');
    setCategorias(await res.json());
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crear(e) {
    e.preventDefault();
    if (!clave.trim() || !nombre.trim()) return;
    const res = await fetch('/api/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave: clave.trim(), nombre: nombre.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'No se pudo crear el bloque.');
      return;
    }
    setClave('');
    setNombre('');
    cargar();
  }

  function iniciarEdicion(c) {
    setEditandoId(c.id);
    setEdicion({ clave: c.clave, nombre: c.nombre });
  }

  async function guardarEdicion(id) {
    if (!edicion.clave.trim() || !edicion.nombre.trim()) return;
    const res = await fetch(`/api/categorias/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave: edicion.clave.trim(), nombre: edicion.nombre.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'No se pudo actualizar el bloque.');
      return;
    }
    setEditandoId(null);
    cargar();
  }

  async function eliminar(c) {
    if (!confirm(`¿Eliminar el bloque "${c.nombre}" (${c.clave})? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/categorias/${c.id}`, { method: 'DELETE' });
    if (res.ok) {
      cargar();
      return;
    }
    const data = await res.json().catch(() => ({}));
    alert(data.error || 'No se pudo eliminar el bloque.');
  }

  return (
    <Layout>
      <div className="card">
        <h2>Bloques / Categorías</h2>
        <p style={{ fontSize: 13.5, color: '#6b7280', marginTop: -8 }}>
          Aquí puedes agregar, renombrar o eliminar los bloques (por ejemplo 24.6, 24.7, 24.12...) sin
          necesidad de pedirle a tu desarrollador que lo haga por ti. Estos bloques son los que eliges
          al dar de alta un cliente o vendedor, y los que aparecen como filtro en el Panel administrativo.
        </p>

        <form onSubmit={crear} className="grid-2">
          <div>
            <label>Clave interna (única, sin espacios)</label>
            <input
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="Ej. 24.12 o 12"
            />
          </div>
          <div>
            <label>Nombre para mostrar</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Bloque 24.12"
            />
          </div>
          <div>
            <button className="btn" type="submit">Agregar bloque</button>
          </div>
        </form>
      </div>

      <div className="card">
        {cargando ? (
          <p>Cargando...</p>
        ) : (
          <div className="table-wrap">
            <table className="tabla-responsiva">
              <thead>
                <tr>
                  <th>Clave interna</th>
                  <th>Nombre</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((c) => {
                  const enEdicion = editandoId === c.id;
                  return (
                    <tr key={c.id}>
                      <td data-label="Clave interna">
                        {enEdicion ? (
                          <input
                            value={edicion.clave}
                            onChange={(e) => setEdicion({ ...edicion, clave: e.target.value })}
                            style={{ marginBottom: 0 }}
                          />
                        ) : (
                          c.clave
                        )}
                      </td>
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
                      <td data-label="Acciones">
                        {enEdicion ? (
                          <>
                            <button className="btn" onClick={() => guardarEdicion(c.id)}>Guardar</button>{' '}
                            <button className="btn secondary" onClick={() => setEditandoId(null)}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button className="btn secondary" onClick={() => iniciarEdicion(c)}>Editar</button>{' '}
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
                {categorias.length === 0 && (
                  <tr>
                    <td colSpan={3}>No hay bloques todavía. Agrega el primero arriba.</td>
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
