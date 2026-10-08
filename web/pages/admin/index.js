import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';

const ESTADOS = ['recibido', 'en_transito', 'listo_entrega', 'entregado'];
const ESTADO_LABEL = {
  recibido: 'Recibido',
  en_transito: 'En tránsito',
  listo_entrega: 'Listo para entrega',
  entregado: 'Entregado',
};

// Convierte la fecha de captura (viene como timestamp de Postgres) a un
// formato corto y legible, igual que en el historial del cliente.
function formatoFechaCaptura(fechaIso) {
  if (!fechaIso) return '';
  const f = new Date(fechaIso);
  if (Number.isNaN(f.getTime())) return '';
  return f.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminPanel() {
  const [paquetes, setPaquetes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [paqueterias, setPaqueterias] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [vaciando, setVaciando] = useState(false);
  const [avisoCopiado, setAvisoCopiado] = useState('');

  // Edición de paquetería/guía — se usa cuando ya se armó la caja de la
  // semana y por fin se sabe con qué paquetería se va a enviar y cuál es
  // el número de guía (esto casi nunca se conoce al momento de escanear).
  const [editandoGuiaId, setEditandoGuiaId] = useState(null);
  const [edicionGuia, setEdicionGuia] = useState({ paqueteria_id: '', numero_guia: '' });
  const [guardandoGuia, setGuardandoGuia] = useState(false);

  // La clienta pidió que la columna de Paquetería/Guía no esté siempre visible
  // en el listado general, porque la mayoría de sus paquetes los recibe de
  // mano del vendedor y nunca les pone paquetería/guía (eso se asigna hasta
  // que arma la caja de la semana para los clientes que sí van por
  // paquetería externa). Por default queda oculta, con un switch para
  // mostrarla cuando sí la necesite — su elección se recuerda en este
  // navegador para que no tenga que activarla cada vez que entra.
  const [mostrarPaqueteriaGuia, setMostrarPaqueteriaGuia] = useState(false);

  useEffect(() => {
    const guardado = window.localStorage.getItem('ayora-mostrar-paqueteria-guia');
    if (guardado === '1') setMostrarPaqueteriaGuia(true);
  }, []);

  function cambiarMostrarPaqueteriaGuia(valor) {
    setMostrarPaqueteriaGuia(valor);
    window.localStorage.setItem('ayora-mostrar-paqueteria-guia', valor ? '1' : '0');
  }

  async function cargar() {
    setCargando(true);
    const url = filtroCategoria ? `/api/paquetes?categoria=${filtroCategoria}` : '/api/paquetes';
    const [pRes, cRes, pqRes] = await Promise.all([
      fetch(url),
      fetch('/api/categorias'),
      fetch('/api/paqueterias'),
    ]);
    setPaquetes(await pRes.json());
    setCategorias(await cRes.json());
    setPaqueterias(await pqRes.json());
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroCategoria]);

  async function cambiarEstado(id, estado) {
    const res = await fetch(`/api/paquetes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    const data = await res.json().catch(() => ({}));
    // El WhatsApp ya se manda solo al cambiar el estado — solo avisamos aquí
    // si ese envío automático falló, para que sepan usar "Notificar WhatsApp"
    // como respaldo manual.
    if (data && data.notificacion && !data.notificacion.ok) {
      alert(
        'El estado se guardó, pero no se pudo avisar por WhatsApp automáticamente: ' +
          (data.notificacion.error || 'error desconocido') +
          '. Puedes usar el botón "Notificar WhatsApp" para intentarlo de nuevo.'
      );
    }
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
      `Vas a eliminar TODOS los paquetes registrados (${paquetes.length} en total), de todos los clientes. Esto NO afecta a tus vendedores ni clientes, solo la lista de paquetes.\n\nPara confirmar, escribe la palabra BORRAR:`
    );
    if (confirmacion === null) return; // canceló el cuadro de confirmación
    // Toleramos espacios de sobra y mayúsculas/minúsculas (ej. "borrar", " Borrar ")
    // para que un detalle de captura en el celular no impida vaciar la lista.
    if (confirmacion.trim().toUpperCase() !== 'BORRAR') {
      alert('No escribiste "BORRAR" exactamente, así que no se eliminó nada.');
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
    } catch (err) {
      alert('No se pudo conectar para vaciar los paquetes. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setVaciando(false);
    }
  }

  function iniciarEdicionGuia(p) {
    setEditandoGuiaId(p.id);
    setEdicionGuia({
      paqueteria_id: p.paqueteria_id || '',
      numero_guia: p.numero_guia || '',
    });
  }

  function cancelarEdicionGuia() {
    setEditandoGuiaId(null);
  }

  async function guardarGuia(id) {
    setGuardandoGuia(true);
    try {
      const res = await fetch(`/api/paquetes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paqueteria_id: edicionGuia.paqueteria_id || null,
          numero_guia: edicionGuia.numero_guia.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert('Error al guardar: ' + (data.error || 'desconocido'));
        return;
      }
      setEditandoGuiaId(null);
      cargar();
    } finally {
      setGuardandoGuia(false);
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

  // Copia la lista de paquetes que se está viendo en este momento (ya
  // filtrada por el buscador y la categoría) como texto separado por
  // tabulaciones, para que al pegarlo en Excel cada dato caiga en su propia
  // columna — igual que el botón "Copiar para Excel" de Vendedores. Pedido
  // de la clienta para poder ver de un vistazo, cada semana, cuáles
  // paquetes ya registró.
  async function copiarParaExcel() {
    const encabezados = [
      'Cliente',
      'Vendedor',
      'Categoría',
      'Paquetería',
      'Número de guía',
      'Estado',
      'Fecha de captura',
    ];

    const filas = filtrados.map((p) => [
      p.cliente_nombre || '',
      p.vendedor_nombre || '',
      p.categoria_nombre || '',
      p.paqueteria_nombre || '',
      p.numero_guia || '',
      ESTADO_LABEL[p.estado] || p.estado || '',
      formatoFechaCaptura(p.capturado_en),
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
        ? `Se copiaron ${filas.length} paquete${filas.length === 1 ? '' : 's'}. Ya puedes pegarlo en Excel (Ctrl/Cmd + V).`
        : 'No se pudo copiar automáticamente. Intenta de nuevo.'
    );
    setTimeout(() => setAvisoCopiado(''), 6000);
  }

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

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 14,
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={mostrarPaqueteriaGuia}
            onChange={(e) => cambiarMostrarPaqueteriaGuia(e.target.checked)}
            style={{ width: 'auto', margin: 0 }}
          />
          Mostrar columna de Paquetería / Guía
        </label>
        <p style={{ fontSize: 12.5, color: '#6b7280', marginTop: 4 }}>
          Actívala cuando armes la caja de la semana y ya sepas con qué paquetería se va cada
          cliente. El resto del tiempo la dejamos oculta para no saturar la pantalla con paquetes
          que no van por paquetería externa.
        </p>

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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 6,
          }}
        >
          <h3 style={{ margin: 0 }}>Listado de paquetes</h3>
          <button className="btn secondary" style={{ fontSize: 12.5, padding: '6px 10px' }} onClick={copiarParaExcel}>
            📋 Copiar para Excel
          </button>
        </div>
        {avisoCopiado && (
          <p style={{ fontSize: 12.5, color: '#065f46', fontWeight: 600, marginTop: 0 }}>{avisoCopiado}</p>
        )}
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
                {mostrarPaqueteriaGuia && <th>Paquetería / Guía</th>}
                <th>Foto</th>
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
                  {mostrarPaqueteriaGuia && (
                  <td data-label="Paquetería / Guía">
                    {editandoGuiaId === p.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
                        <select
                          value={edicionGuia.paqueteria_id}
                          onChange={(e) => setEdicionGuia({ ...edicionGuia, paqueteria_id: e.target.value })}
                          style={{ marginBottom: 0 }}
                        >
                          <option value="">-- Paquetería --</option>
                          {paqueterias.map((pq) => (
                            <option key={pq.id} value={pq.id}>
                              {pq.nombre}
                            </option>
                          ))}
                        </select>
                        <input
                          value={edicionGuia.numero_guia}
                          onChange={(e) => setEdicionGuia({ ...edicionGuia, numero_guia: e.target.value })}
                          placeholder="Número de guía"
                          style={{ marginBottom: 0 }}
                        />
                        <div>
                          <button
                            className="btn"
                            style={{ padding: '6px 10px', fontSize: 12 }}
                            onClick={() => guardarGuia(p.id)}
                            disabled={guardandoGuia}
                          >
                            {guardandoGuia ? 'Guardando...' : 'Guardar'}
                          </button>{' '}
                          <button
                            className="btn secondary"
                            style={{ padding: '6px 10px', fontSize: 12 }}
                            onClick={cancelarEdicionGuia}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {p.paqueteria_nombre || '—'} {p.numero_guia ? `(${p.numero_guia})` : ''}{' '}
                        <button
                          className="btn secondary"
                          style={{ padding: '4px 8px', fontSize: 11.5, marginTop: 4 }}
                          onClick={() => iniciarEdicionGuia(p)}
                        >
                          {p.numero_guia ? 'Editar guía' : 'Agregar guía'}
                        </button>
                      </>
                    )}
                  </td>
                  )}
                  <td data-label="Foto">
                    {p.foto ? (
                      <a href={p.foto} target="_blank" rel="noreferrer">
                        <img
                          src={p.foto}
                          alt="Foto del paquete"
                          style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, display: 'block' }}
                        />
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>Sin foto</span>
                    )}
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
                    <button className="btn secondary" onClick={() => notificar(p.id)} title="El WhatsApp ya se manda solo al cambiar el estado — usa esto solo si necesitas reenviarlo">
                      Reenviar WhatsApp
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
                  <td colSpan={mostrarPaqueteriaGuia ? 7 : 6}>No hay paquetes que coincidan.</td>
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
