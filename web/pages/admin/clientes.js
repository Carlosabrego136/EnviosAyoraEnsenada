import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [categoriaId, setCategoriaId] = useState('');

  async function cargar() {
    const [clRes, cRes] = await Promise.all([fetch('/api/clientes'), fetch('/api/categorias')]);
    setClientes(await clRes.json());
    setCategorias(await cRes.json());
  }

  useEffect(() => {
    cargar();
  }, []);

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
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Categoría</th>
              <th>QR</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id}>
                <td>{c.nombre}</td>
                <td>{c.telefono || '—'}</td>
                <td>{c.categoria_nombre || 'General'}</td>
                <td>
                  <a className="btn secondary" href={`/api/qr/cliente/${c.id}`} target="_blank" rel="noreferrer">
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
