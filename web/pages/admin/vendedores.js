import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';

export default function Vendedores() {
  const [vendedores, setVendedores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [nombre, setNombre] = useState('');
  const [categoriaId, setCategoriaId] = useState('');

  async function cargar() {
    const [vRes, cRes] = await Promise.all([fetch('/api/vendedores'), fetch('/api/categorias')]);
    setVendedores(await vRes.json());
    setCategorias(await cRes.json());
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crear(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    await fetch('/api/vendedores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, categoria_id: categoriaId || null }),
    });
    setNombre('');
    setCategoriaId('');
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
            <label>Categoría / bloque (opcional)</label>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              <option value="">-- Ninguna --</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <button className="btn" type="submit">Agregar vendedor</button>
          </div>
        </form>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>QR</th>
            </tr>
          </thead>
          <tbody>
            {vendedores.map((v) => (
              <tr key={v.id}>
                <td>{v.nombre}</td>
                <td>{v.categoria_nombre || '—'}</td>
                <td>
                  <a className="btn secondary" href={`/api/qr/vendedor/${v.id}`} target="_blank" rel="noreferrer">
                    Ver / imprimir QR
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
