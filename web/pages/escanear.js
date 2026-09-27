import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';

// Flujo: 1) escanea QR del vendedor  2) escanea QR del cliente  3) (opcional) paquetería/guía  4) guarda
export default function Escanear() {
  const [paso, setPaso] = useState(1);
  const [vendedorQr, setVendedorQr] = useState('');
  const [clienteQr, setClienteQr] = useState('');
  const [paqueterias, setPaqueterias] = useState([]);
  const [paqueteriaId, setPaqueteriaId] = useState('');
  const [numeroGuia, setNumeroGuia] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);

  const html5QrRef = useRef(null);
  const pasoRef = useRef(1); // el callback de la cámara siempre debe leer el paso más reciente
  const procesandoRef = useRef(false); // evita procesar el mismo código dos veces mientras cambiamos de paso

  useEffect(() => {
    pasoRef.current = paso;
  }, [paso]);

  useEffect(() => {
    fetch('/api/paqueterias')
      .then((r) => r.json())
      .then(setPaqueterias)
      .catch(() => {});
  }, []);

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
    if (paso === 1 || paso === 2) {
      iniciarScanner();
    } else {
      detenerScanner();
    }
    return () => {
      detenerScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso]);

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
          paqueteria_id: paqueteriaId || null,
          numero_guia: numeroGuia || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      setMensaje(`Guardado: ${data.vendedor} → ${data.cliente}`);
      // reiniciar para el siguiente paquete
      setVendedorQr('');
      setClienteQr('');
      setPaqueteriaId('');
      setNumeroGuia('');
      setPaso(1);
    } catch (err) {
      setError(err.message);
    }
  }

  function reiniciar() {
    setVendedorQr('');
    setClienteQr('');
    setError(null);
    setMensaje(null);
    procesandoRef.current = false;
    if (paso === 1) {
      // ya estamos en el paso 1: solo reiniciamos la cámara por si quedó en mal estado
      iniciarScanner();
    } else {
      setPaso(1);
    }
  }

  return (
    <Layout>
      <div className="card">
        <h2>Capturar paquete</h2>
        <p>
          Paso {paso} de 3 —{' '}
          {paso === 1 && 'escanea el QR del VENDEDOR'}
          {paso === 2 && 'escanea el QR del CLIENTE'}
          {paso === 3 && 'confirma y guarda'}
        </p>

        {paso === 1 && (
          <p style={{ fontSize: 13, color: '#4b5563', marginTop: -6 }}>
            Apunta la cámara al código QR <b>impreso</b> del vendedor que entrega el paquete
            (su tarjeta o gafete). No es necesario buscarlo en el sistema.
          </p>
        )}
        {paso === 2 && (
          <p style={{ fontSize: 13, color: '#4b5563', marginTop: -6 }}>
            Ahora apunta la cámara al código QR <b>impreso</b> del cliente que va a recibir el
            paquete (su tarjeta o el que tiene pegado en su casillero).
          </p>
        )}
        {paso === 3 && (
          <p style={{ fontSize: 13, color: '#4b5563', marginTop: -6 }}>
            Revisa que el vendedor y el cliente sean los correctos, agrega la paquetería/guía si
            la tienes, y guarda para registrar el paquete.
          </p>
        )}

        {mensaje && <p style={{ color: '#065f46', fontWeight: 600 }}>{mensaje}</p>}
        {error && <p style={{ color: '#b91c1c', fontWeight: 600 }}>{error}</p>}

        {(paso === 1 || paso === 2) && (
          <div>
            <div id="lector-qr" style={{ width: '100%', maxWidth: 400 }} />
            <button className="btn secondary" onClick={reiniciar} style={{ marginTop: 10 }}>
              Cancelar
            </button>
          </div>
        )}

        {paso === 3 && (
          <div>
            <p>
              Vendedor QR: <b>{vendedorQr}</b>
              <br />
              Cliente QR: <b>{clienteQr}</b>
            </p>

            <label>Paquetería (opcional)</label>
            <select value={paqueteriaId} onChange={(e) => setPaqueteriaId(e.target.value)}>
              <option value="">-- Selecciona --</option>
              {paqueterias.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>

            <label>Número de guía (opcional)</label>
            <input
              value={numeroGuia}
              onChange={(e) => setNumeroGuia(e.target.value)}
              placeholder="Ej. 313103"
            />

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
