import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';

// Flujo:
//  1) escanea QR del vendedor (UNA vez)
//  2) escanea QR del cliente
//  3) (opcional) paquetería/guía y guarda
//  4) regresa directo al paso 2 para escanear al SIGUIENTE cliente del MISMO vendedor,
//     sin tener que volver a escanear al vendedor — útil para vendedores que entregan
//     muchos paquetes seguidos. Solo se vuelve a escanear vendedor si se cambia de vendedor.
// Clave para recordar en este celular cuál fue el último vendedor usado, así
// no hay que volver a escanear su QR cada vez que se abre la página — pedido
// explícito de la clienta, que siempre es la misma vendedora escaneando.
const CLAVE_VENDEDOR_RECORDADO = 'ayora-escanear-vendedor';

export default function Escanear() {
  const [paso, setPaso] = useState(1);
  const [vendedorQr, setVendedorQr] = useState('');
  const [vendedorNombre, setVendedorNombre] = useState('');
  const [clienteQr, setClienteQr] = useState('');
  const [paquetesGuardados, setPaquetesGuardados] = useState(0); // contador de la ráfaga actual
  const [fotoBase64, setFotoBase64] = useState(null);
  const [fotoCargando, setFotoCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);

  // Modo de los pasos 1 y 2: escanear con la cámara (como antes) o buscar
  // directo por nombre en una lista — para quien prefiera no escanear nada.
  const [modo, setModo] = useState('camara');
  const [vendedoresLista, setVendedoresLista] = useState([]);
  const [clientesLista, setClientesLista] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [busquedaLista, setBusquedaLista] = useState('');

  const html5QrRef = useRef(null);
  const pasoRef = useRef(1); // el callback de la cámara siempre debe leer el paso más reciente
  const procesandoRef = useRef(false); // evita procesar el mismo código dos veces mientras cambiamos de paso

  useEffect(() => {
    pasoRef.current = paso;
  }, [paso]);

  // Al abrir la página, si ya había un vendedor recordado de la vez pasada,
  // se salta directo al paso 2 (escanear/buscar cliente) sin pedir de nuevo
  // el QR del vendedor.
  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CLAVE_VENDEDOR_RECORDADO);
      if (guardado) {
        const datos = JSON.parse(guardado);
        if (datos && datos.qr) {
          setVendedorQr(datos.qr);
          setVendedorNombre(datos.nombre || '');
          setPaso(2);
        }
      }
    } catch (err) {
      // si el navegador no permite localStorage, simplemente no se recuerda
    }
  }, []);

  // Cada vez que se confirma un vendedor (por escaneo, por búsqueda, o al
  // llenarse su nombre tras el primer guardado), se recuerda en este
  // celular para la próxima vez que se abra la página.
  useEffect(() => {
    if (!vendedorQr) return;
    try {
      window.localStorage.setItem(
        CLAVE_VENDEDOR_RECORDADO,
        JSON.stringify({ qr: vendedorQr, nombre: vendedorNombre || '' })
      );
    } catch (err) {}
  }, [vendedorQr, vendedorNombre]);

  // Selecciona un vendedor (desde la búsqueda) y avanza al paso 2, igual que
  // si se hubiera escaneado su QR.
  function elegirVendedor(v) {
    procesandoRef.current = true;
    setError(null);
    setVendedorQr(v.qr_codigo);
    setVendedorNombre(v.nombre);
    setPaquetesGuardados(0);
    setPaso(2);
  }

  // Selecciona un cliente (desde la búsqueda) y avanza al paso 3, igual que
  // si se hubiera escaneado su QR.
  function elegirCliente(c) {
    procesandoRef.current = true;
    setError(null);
    setClienteQr(c.qr_codigo);
    setPaso(3);
  }

  // Trae la lista de vendedores o clientes (según el paso) la primera vez
  // que se usa el modo de búsqueda, para no pedirla si nunca se usa.
  useEffect(() => {
    if (modo !== 'buscar') return;
    setBusquedaLista('');
    async function cargarLista() {
      setCargandoLista(true);
      try {
        if (paso === 1 && vendedoresLista.length === 0) {
          const res = await fetch('/api/vendedores');
          setVendedoresLista(await res.json());
        } else if (paso === 2 && clientesLista.length === 0) {
          const res = await fetch('/api/clientes');
          setClientesLista(await res.json());
        }
      } catch (err) {
        setError('No se pudo cargar la lista. Revisa tu conexión e intenta de nuevo.');
      } finally {
        setCargandoLista(false);
      }
    }
    cargarLista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, paso]);

  const listaFiltrada = (paso === 1 ? vendedoresLista : clientesLista).filter((item) => {
    const q = busquedaLista.trim().toLowerCase();
    if (!q) return true;
    return item.nombre.toLowerCase().includes(q);
  });

  // Detiene y limpia por completo la cámara antes de volver a usarla.
  // Esto es lo que evita que el siguiente escaneo "arrastre" el código anterior.
  async function detenerScanner() {
    const qr = html5QrRef.current;
    html5QrRef.current = null;
    if (qr) {
      try {
        await qr.stop();
      } catch (err) {
        // si ya estaba detenida, no pasa nada
      }
      try {
        await qr.clear();
      } catch (err) {}
    }
  }

  async function iniciarScanner() {
    await detenerScanner(); // por seguridad, nunca dos cámaras corriendo a la vez
    procesandoRef.current = false;

    const { Html5Qrcode } = await import('html5-qrcode');
    const html5QrCode = new Html5Qrcode('lector-qr');
    html5QrRef.current = html5QrCode;

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          if (procesandoRef.current) return; // ignora lecturas repetidas del mismo cuadro
          const pasoActual = pasoRef.current;

          if (pasoActual === 1) {
            if (!decodedText.startsWith('VEND-')) {
              setError('Ese código no es de un VENDEDOR. Escanea el QR del vendedor.');
              return;
            }
            procesandoRef.current = true;
            setError(null);
            setVendedorQr(decodedText);
            setVendedorNombre('');
            setPaquetesGuardados(0);
            setPaso(2);
          } else if (pasoActual === 2) {
            if (!decodedText.startsWith('CLI-')) {
              setError('Ese código no es de un CLIENTE. Escanea el QR del cliente.');
              return;
            }
            procesandoRef.current = true;
            setError(null);
            setClienteQr(decodedText);
            setPaso(3);
          }
        },
        () => {} // ignorar errores de frame sin QR
      );
    } catch (err) {
      setError('No se pudo abrir la cámara: ' + err);
    }
  }

  useEffect(() => {
    if ((paso === 1 || paso === 2) && modo === 'camara') {
      iniciarScanner();
    } else {
      detenerScanner();
    }
    return () => {
      detenerScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso, modo]);

  // Toma la foto elegida/tomada con la cámara del celular, la reduce de tamaño
  // (para que no pese varios MB) y la deja lista en base64 para guardarla.
  function manejarFoto(e) {
    const archivo = e.target.files && e.target.files[0];
    if (!archivo) return;
    setFotoCargando(true);
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxAncho = 900;
        const escala = Math.min(1, maxAncho / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * escala;
        canvas.height = img.height * escala;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setFotoBase64(canvas.toDataURL('image/jpeg', 0.7));
        setFotoCargando(false);
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  }

  function quitarFoto() {
    setFotoBase64(null);
  }

  async function guardar() {
    setError(null);
    setMensaje(null);
    try {
      const res = await fetch('/api/escanear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendedor_qr: vendedorQr,
          cliente_qr: clienteQr,
          foto: fotoBase64 || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      setMensaje(`Guardado: ${data.vendedor} → ${data.cliente}`);
      setVendedorNombre(data.vendedor);
      setPaquetesGuardados((n) => n + 1);

      // Seguimos con el MISMO vendedor: regresamos directo al paso 2 para
      // escanear al siguiente cliente, sin volver a pedir el QR del vendedor.
      setClienteQr('');
      setFotoBase64(null);
      setPaso(2);
    } catch (err) {
      setError(err.message);
    }
  }

  // Termina la ráfaga del vendedor actual y vuelve a pedir el QR de un nuevo vendedor.
  function cambiarVendedor() {
    setVendedorQr('');
    setVendedorNombre('');
    setClienteQr('');
    setPaquetesGuardados(0);
    setFotoBase64(null);
    setError(null);
    setMensaje(null);
    procesandoRef.current = false;
    setPaso(1);
    try {
      window.localStorage.removeItem(CLAVE_VENDEDOR_RECORDADO);
    } catch (err) {}
  }

  function reiniciar() {
    setClienteQr('');
    setFotoBase64(null);
    setError(null);
    setMensaje(null);
    procesandoRef.current = false;
    if (paso === 1) {
      // ya estamos en el paso 1: solo reiniciamos la cámara por si quedó en mal estado
      // (si está en modo "buscar" no hay cámara que reiniciar)
      if (modo === 'camara') iniciarScanner();
    } else if (vendedorQr) {
      // seguimos con el mismo vendedor, solo reiniciamos el escaneo del cliente
      setPaso(2);
    } else {
      setPaso(1);
    }
  }

  return (
    <Layout>
      <div className="card">
        <h2>Capturar paquete</h2>

        {vendedorQr && (paso === 2 || paso === 3) && (
          <div
            style={{
              background: '#eef2ff',
              border: '1px solid #c7d2fe',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 14,
              fontSize: 14,
            }}
          >
            Vendedor actual: <b>{vendedorNombre || vendedorQr}</b>
            {paquetesGuardados > 0 && (
              <span style={{ color: '#4338ca' }}> — {paquetesGuardados} paquete(s) capturado(s) en esta ráfaga</span>
            )}
            <p style={{ margin: '6px 0 8px', fontSize: 12.5, color: '#4338ca' }}>
              Puedes escanear solo <b>este</b> paquete y salir cuando quieras, o seguir escaneando
              más clientes de este mismo vendedor — tú decides, nada te obliga a continuar.
            </p>
            <button
              className="btn secondary"
              style={{ fontSize: 12, padding: '6px 10px' }}
              onClick={cambiarVendedor}
            >
              Terminar / cambiar de vendedor
            </button>
          </div>
        )}

        <p>
          Paso {paso === 1 ? '1' : paso === 2 ? '2' : '3'} —{' '}
          {paso === 1 && 'escanea el QR del VENDEDOR'}
          {paso === 2 && 'escanea el QR del CLIENTE'}
          {paso === 3 && 'confirma y guarda'}
        </p>

        {paso === 1 && modo === 'camara' && (
          <p style={{ fontSize: 13, color: '#4b5563', marginTop: -6 }}>
            Apunta la cámara al código QR <b>impreso</b> del vendedor que entrega el paquete
            (su tarjeta o gafete). No es necesario buscarlo en el sistema.
          </p>
        )}
        {paso === 2 && modo === 'camara' && (
          <p style={{ fontSize: 13, color: '#4b5563', marginTop: -6 }}>
            Ahora apunta la cámara al código QR <b>impreso</b> del cliente que va a recibir el
            paquete. Si este vendedor entrega varios paquetes, puedes seguir escaneando cliente
            tras cliente sin volver a escanear al vendedor.
          </p>
        )}
        {paso === 1 && modo === 'buscar' && (
          <p style={{ fontSize: 13, color: '#4b5563', marginTop: -6 }}>
            Escribe el nombre del vendedor y elígelo de la lista, sin necesidad de escanear su QR.
          </p>
        )}
        {paso === 2 && modo === 'buscar' && (
          <p style={{ fontSize: 13, color: '#4b5563', marginTop: -6 }}>
            Escribe el nombre del cliente y elígelo de la lista, sin necesidad de escanear su QR.
          </p>
        )}

        {(paso === 1 || paso === 2) && (
          <div style={{ marginBottom: 10 }}>
            <button
              className={modo === 'camara' ? 'btn' : 'btn secondary'}
              style={{ fontSize: 12.5, padding: '6px 10px', marginRight: 8 }}
              onClick={() => setModo('camara')}
            >
              📷 Escanear
            </button>
            <button
              className={modo === 'buscar' ? 'btn' : 'btn secondary'}
              style={{ fontSize: 12.5, padding: '6px 10px' }}
              onClick={() => setModo('buscar')}
            >
              🔎 Buscar por nombre
            </button>
          </div>
        )}
        {paso === 3 && (
          <p style={{ fontSize: 13, color: '#4b5563', marginTop: -6 }}>
            Revisa que el cliente sea el correcto, toma o adjunta la foto del paquete, y guarda.
            La paquetería y el número de guía se agregan después, cuando se arme la caja de la
            semana (desde el panel, con el botón "Agregar guía"). Al guardar, regresas directo a
            escanear el siguiente cliente de este mismo vendedor.
          </p>
        )}

        {mensaje && <p style={{ color: '#065f46', fontWeight: 600 }}>{mensaje}</p>}
        {error && <p style={{ color: '#b91c1c', fontWeight: 600 }}>{error}</p>}

        {(paso === 1 || paso === 2) && modo === 'camara' && (
          <div>
            <div id="lector-qr" style={{ width: '100%', maxWidth: 400 }} />
            <button className="btn secondary" onClick={reiniciar} style={{ marginTop: 10 }}>
              Cancelar
            </button>
          </div>
        )}

        {(paso === 1 || paso === 2) && modo === 'buscar' && (
          <div>
            <input
              type="text"
              placeholder={paso === 1 ? 'Buscar vendedor por nombre...' : 'Buscar cliente por nombre...'}
              value={busquedaLista}
              onChange={(e) => setBusquedaLista(e.target.value)}
              style={{ width: '100%', maxWidth: 400, marginBottom: 10 }}
              autoFocus
            />

            {cargandoLista && <p style={{ fontSize: 13, color: '#6b7280' }}>Cargando lista...</p>}

            {!cargandoLista && (
              <div style={{ maxWidth: 400, maxHeight: 320, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                {listaFiltrada.length === 0 && (
                  <p style={{ padding: 12, fontSize: 13, color: '#6b7280', margin: 0 }}>
                    No se encontró {paso === 1 ? 'ningún vendedor' : 'ningún cliente'} con ese nombre.
                  </p>
                )}
                {listaFiltrada.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => (paso === 1 ? elegirVendedor(item) : elegirCliente(item))}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      border: 'none',
                      borderBottom: '1px solid #f1f5f9',
                      background: '#fff',
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    {item.nombre}
                    {paso === 2 && item.categoria_nombre && (
                      <span style={{ color: '#6b7280', fontSize: 12.5 }}> — {item.categoria_nombre}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <button className="btn secondary" onClick={reiniciar} style={{ marginTop: 10 }}>
              Cancelar
            </button>
          </div>
        )}

        {paso === 3 && (
          <div>
            <p>
              Cliente QR: <b>{clienteQr}</b>
            </p>

            <label>Foto del paquete (opcional)</label>
            {!fotoBase64 && (
              /* Sin el atributo "capture": así se muestran las dos opciones
                 (tomar foto o elegir de archivos/galería) en vez de forzar
                 que se abra directo la cámara. */
              <input type="file" accept="image/*" onChange={manejarFoto} />
            )}
            {fotoCargando && <p style={{ fontSize: 13, color: '#6b7280' }}>Procesando foto...</p>}
            {fotoBase64 && (
              <div style={{ marginBottom: 12 }}>
                <img
                  src={fotoBase64}
                  alt="Foto del paquete"
                  style={{ width: '100%', maxWidth: 260, borderRadius: 8, display: 'block', marginBottom: 6 }}
                />
                <button className="btn secondary" onClick={quitarFoto} style={{ fontSize: 12, padding: '6px 10px' }}>
                  Quitar foto
                </button>
              </div>
            )}

            <button className="btn" onClick={guardar}>
              Guardar paquete
            </button>{' '}
            <button className="btn secondary" onClick={reiniciar}>
              Reiniciar
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
