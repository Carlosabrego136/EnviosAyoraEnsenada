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
  const scannerRef = useRef(null);

  useEffect(() => {
    fetch('/api/paqueterias')
      .then((r) => r.json())
      .then(setPaqueterias)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (paso !== 1 && paso !== 2) return;

    let html5QrCode;
    let cancelado = false;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelado) return;
      html5QrCode = new Html5Qrcode('lector-qr');
      scannerRef.current = html5QrCode;

      html5QrCode
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            if (paso === 1) {
              setVendedorQr(decodedText);
              setPaso(2);
            } else if (paso === 2) {
              setClienteQr(decodedText);
              setPaso(3);
            }
          },
          () => {} // ignorar errores de frame sin QR
        )
        .catch((err) => setError('No se pudo abrir la cámara: ' + err));
    });

    return () => {
      cancelado = true;
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
      }
    };
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
    setPaso(1);
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
