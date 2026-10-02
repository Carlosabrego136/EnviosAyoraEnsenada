import { useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout';

const CAMPOS_VACIOS = {
  nombre: '',
  telefono: '',
  domicilio: '',
  facebook: '',
  referencia: '',
  paqueteria: '',
  numero_cajas: '',
  kilos: '',
};

// Arma el mensaje de WhatsApp ya formateado con todos los datos del cliente,
// listo para copiar y pegar donde se necesite (al cliente, a un grupo, a la
// paquetería, etc.).
function armarMensaje(r) {
  const lineas = [
    '📦 Registro de envío — ENVIOS AYORA',
    '',
    `Nombre: ${r.nombre || '-'}`,
    `Teléfono: ${r.telefono || '-'}`,
    `Domicilio: ${r.domicilio || '-'}`,
    `Facebook: ${r.facebook || '-'}`,
    `Referencia: ${r.referencia || '-'}`,
    '',
    `Paquetería: ${r.paqueteria || '-'}`,
    `Número de cajas: ${r.numero_cajas ?? '-'}`,
    `Kilos: ${r.kilos ?? '-'}`,
  ];
  return lineas.join('\n');
}

async function copiarAlPortapapeles(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch (err) {
    // sigue al respaldo de abajo
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = texto;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch (err) {
    return false;
  }
}

export default function RegistroClientes() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nuevo, setNuevo] = useState(CAMPOS_VACIOS);
  const [busqueda, setBusqueda] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [edicion, setEdicion] = useState(CAMPOS_VACIOS);
  const [avisoCopiado, setAvisoCopiado] = useState('');

  async function cargar() {
    setCargando(true);
    const res = await fetch('/api/registros-clientes');
    setRegistros(await res.json());
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crear(e) {
    e.preventDefault();
    if (!nuevo.nombre.trim()) {
      alert('El nombre es obligatorio.');
      return;
    }
    await fetch('/api/registros-clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...nuevo,
        numero_cajas: nuevo.numero_cajas === '' ? null : Number(nuevo.numero_cajas),
        kilos: nuevo.kilos === '' ? null : Number(nuevo.kilos),
      }),
    });
    setNuevo(CAMPOS_VACIOS);
    cargar();
  }

  function iniciarEdicion(r) {
    setEditandoId(r.id);
    setEdicion({
      nombre: r.nombre || '',
      telefono: r.telefono || '',
      domicilio: r.domicilio || '',
      facebook: r.facebook || '',
      referencia: r.referencia || '',
      paqueteria: r.paqueteria || '',
      numero_cajas: r.numero_cajas ?? '',
      kilos: r.kilos ?? '',
    });
  }

  async function guardarEdicion(id) {
    if (!edicion.nombre.trim()) {
      alert('El nombre es obligatorio.');
      return;
    }
    await fetch(`/api/registros-clientes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...edicion,
        numero_cajas: edicion.numero_cajas === '' ? null : Number(edicion.numero_cajas),
        kilos: edicion.kilos === '' ? null : Number(edicion.kilos),
      }),
    });
    setEditandoId(null);
    cargar();
  }

  async function eliminar(r) {
    if (!confirm(`¿Eliminar el registro de "${r.nombre}"? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/registros-clientes/${r.id}`, { method: 'DELETE' });
    cargar();
  }

  async function copiarMensaje(r) {
    const copiado = await copiarAlPortapapeles(armarMensaje(r));
    setAvisoCopiado(
      copiado
        ? `Se copió el mensaje de "${r.nombre}". Ya puedes pegarlo (Ctrl/Cmd + V) donde lo necesites.`
        : 'No se pudo copiar automáticamente. Intenta de nuevo.'
    );
    setTimeout(() => setAvisoCopiado(''), 6000);
  }

  const registrosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return registros;
    return registros.filter((r) => r.nombre.toLowerCase().includes(q));
  }, [registros, busqueda]);

  return (
    <Layout>
      <div className="card">
        <h2>Registro de clientes</h2>
        <p style={{ color: '#6b7280', fontSize: 13.5, marginTop: -8, marginBottom: 16 }}>
          Guarda los datos del cliente y su envío, y copia el mensaje ya armado para mandarlo por WhatsApp.
        </p>
        <form onSubmit={crear} className="grid-2">
          <div>
            <label>Nombre</label>
            <input
              value={nuevo.nombre}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
              placeholder="Nombre del cliente"
            />
          </div>
          <div>
            <label>Teléfono</label>
            <input
              value={nuevo.telefono}
              onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
              placeholder="Ej. 6461234567"
            />
          </div>
          <div>
            <label>Domicilio</label>
            <input
              value={nuevo.domicilio}
              onChange={(e) => setNuevo({ ...nuevo, domicilio: e.target.value })}
              placeholder="Dirección del cliente"
            />
          </div>
          <div>
            <label>Facebook</label>
            <input
              value={nuevo.facebook}
              onChange={(e) => setNuevo({ ...nuevo, facebook: e.target.value })}
              placeholder="Nombre o link de perfil"
            />
          </div>
          <div>
            <label>Referencia</label>
            <input
              value={nuevo.referencia}
              onChange={(e) => setNuevo({ ...nuevo, referencia: e.target.value })}
              placeholder="Referencia del domicilio"
            />
          </div>
          <div>
            <label>Paquetería</label>
            <input
              value={nuevo.paqueteria}
              onChange={(e) => setNuevo({ ...nuevo, paqueteria: e.target.value })}
              placeholder="Ej. FedEx, DHL, Estafeta..."
            />
          </div>
          <div>
            <label># de cajas</label>
            <input
              type="number"
              min="0"
              value={nuevo.numero_cajas}
              onChange={(e) => setNuevo({ ...nuevo, numero_cajas: e.target.value })}
              placeholder="Ej. 3"
            />
          </div>
          <div>
            <label>Kilos</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={nuevo.kilos}
              onChange={(e) => setNuevo({ ...nuevo, kilos: e.target.value })}
              placeholder="Ej. 12.5"
            />
          </div>
          <div>
            <button className="btn" type="submit">Guardar registro</button>
          </div>
        </form>
      </div>

      <div className="card">
        <label>Buscar por nombre</label>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Escribe un nombre para filtrar..."
        />

        {avisoCopiado && (
          <p style={{ color: '#15803d', fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>{avisoCopiado}</p>
        )}

        {cargando ? (
          <p>Cargando...</p>
        ) : registrosFiltrados.length === 0 ? (
          <p>No hay registros para mostrar.</p>
        ) : (
          <div className="table-wrap">
            <table className="tabla-responsiva">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Paquetería</th>
                  <th># cajas</th>
                  <th>Kilos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((r) => {
                  const enEdicion = editandoId === r.id;
                  return (
                    <tr key={r.id}>
                      <td data-label="Nombre">
                        {enEdicion ? (
                          <input
                            value={edicion.nombre}
                            onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })}
                            style={{ marginBottom: 0 }}
                          />
                        ) : (
                          r.nombre
                        )}
                      </td>
                      <td data-label="Teléfono">
                        {enEdicion ? (
                          <input
                            value={edicion.telefono}
                            onChange={(e) => setEdicion({ ...edicion, telefono: e.target.value })}
                            style={{ marginBottom: 0 }}
                          />
                        ) : (
                          r.telefono || '—'
                        )}
                      </td>
                      <td data-label="Paquetería">
                        {enEdicion ? (
                          <input
                            value={edicion.paqueteria}
                            onChange={(e) => setEdicion({ ...edicion, paqueteria: e.target.value })}
                            style={{ marginBottom: 0 }}
                          />
                        ) : (
                          r.paqueteria || '—'
                        )}
                      </td>
                      <td data-label="# cajas">
                        {enEdicion ? (
                          <input
                            type="number"
                            value={edicion.numero_cajas}
                            onChange={(e) => setEdicion({ ...edicion, numero_cajas: e.target.value })}
                            style={{ marginBottom: 0 }}
                          />
                        ) : (
                          r.numero_cajas ?? '—'
                        )}
                      </td>
                      <td data-label="Kilos">
                        {enEdicion ? (
                          <input
                            type="number"
                            step="0.01"
                            value={edicion.kilos}
                            onChange={(e) => setEdicion({ ...edicion, kilos: e.target.value })}
                            style={{ marginBottom: 0 }}
                          />
                        ) : (
                          r.kilos ?? '—'
                        )}
                      </td>
                      <td data-label="Acciones">
                        {enEdicion ? (
                          <>
                            <button className="btn" onClick={() => guardarEdicion(r.id)}>Guardar</button>{' '}
                            <button className="btn secondary" onClick={() => setEditandoId(null)}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button className="btn secondary" onClick={() => copiarMensaje(r)}>
                              📋 Copiar mensaje
                            </button>{' '}
                            <button className="btn secondary" onClick={() => iniciarEdicion(r)}>Editar</button>{' '}
                            <button
                              className="btn secondary"
                              style={{ color: '#b91c1c' }}
                              onClick={() => eliminar(r)}
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
