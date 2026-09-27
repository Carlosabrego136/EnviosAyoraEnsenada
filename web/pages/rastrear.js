import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const ESTADO_LABEL = {
  recibido: 'Recibido en bodega',
  en_transito: 'En tránsito',
  listo_entrega: 'Listo para entrega',
  entregado: 'Entregado',
};

const ESTADO_ICONO = {
  recibido: '📦',
  en_transito: '🚚',
  listo_entrega: '🏁',
  entregado: '✅',
};

const ORDEN_ESTADOS = ['recibido', 'en_transito', 'listo_entrega', 'entregado'];

function formatoFecha(fechaIso) {
  if (!fechaIso) return '';
  const d = new Date(fechaIso);
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Linea({ paquete }) {
  const pasoActual = ORDEN_ESTADOS.indexOf(paquete.estado);

  // Construimos la línea de tiempo a partir del historial real, pero si algún
  // paso todavía no ocurrió, lo mostramos "pendiente" para que el cliente vea
  // el recorrido completo del envío de un vistazo.
  const historialPorEstado = {};
  (paquete.historial || []).forEach((h) => {
    if (!historialPorEstado[h.estado]) historialPorEstado[h.estado] = h.creado_en;
  });

  return (
    <div className="rastreo-card">
      <div className="rastreo-card-top">
        <div>
          <div className="rastreo-guia">
            {paquete.paqueteria_nombre || 'Paquete'} {paquete.numero_guia ? `· Guía ${paquete.numero_guia}` : ''}
          </div>
          <div className="rastreo-cliente">Para: {paquete.cliente_nombre}</div>
        </div>
        <span className={`rastreo-badge estado-${paquete.estado}`}>{ESTADO_LABEL[paquete.estado] || paquete.estado}</span>
      </div>

      {paquete.foto && (
        <img src={paquete.foto} alt="Foto del paquete" className="rastreo-foto" />
      )}

      <div className="rastreo-timeline">
        {ORDEN_ESTADOS.map((estado, i) => {
          const completado = i <= pasoActual;
          const fecha = historialPorEstado[estado];
          return (
            <div key={estado} className={`rastreo-paso ${completado ? 'completado' : ''}`}>
              <div className="rastreo-punto">
                <span>{ESTADO_ICONO[estado]}</span>
              </div>
              {i < ORDEN_ESTADOS.length - 1 && <div className={`rastreo-linea ${i < pasoActual ? 'completado' : ''}`} />}
              <div className="rastreo-paso-texto">
                <div className="rastreo-paso-label">{ESTADO_LABEL[estado]}</div>
                <div className="rastreo-paso-fecha">{fecha ? formatoFecha(fecha) : completado ? formatoFecha(paquete.capturado_en) : 'Pendiente'}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Rastrear() {
  const [valor, setValor] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');
  const [paquetes, setPaquetes] = useState(null);

  async function buscar(e) {
    e.preventDefault();
    if (!valor.trim()) return;
    setBuscando(true);
    setError('');
    setPaquetes(null);
    try {
      const res = await fetch(`/api/rastrear/${encodeURIComponent(valor.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No encontramos información con ese dato.');
        return;
      }
      setPaquetes(data.paquetes);
    } catch (err) {
      setError('No se pudo conectar. Intenta de nuevo en unos segundos.');
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="rastreo-shell">
      <Head>
        <title>Rastrea tu envío — ENVIOS AYORA</title>
        <link rel="icon" href="/logo.jpg" />
      </Head>

      <header className="rastreo-header">
        <Link href="/" className="rastreo-brand">
          <img src="/logo.jpg" alt="ENVIOS AYORA" />
        </Link>
      </header>

      <main className="rastreo-main">
        <div className="rastreo-hero-texto">
          <span className="rastreo-eyebrow">Rastreo de envíos</span>
          <h1>¿Dónde está tu paquete?</h1>
          <p>Escribe tu número de guía o tu código de cliente para ver el estado de tu envío al instante.</p>
        </div>

        <form className="rastreo-form" onSubmit={buscar}>
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Ej. 1Z999AA10123456784 o CLI-abc123"
            autoCapitalize="characters"
          />
          <button type="submit" className="rastreo-btn" disabled={buscando}>
            {buscando ? 'Buscando...' : 'Rastrear'}
          </button>
        </form>

        {error && <div className="rastreo-error">{error}</div>}

        {paquetes && (
          <div className="rastreo-resultados">
            {paquetes.map((p) => (
              <Linea key={p.id} paquete={p} />
            ))}
          </div>
        )}
      </main>

      <footer className="rastreo-footer">ENVIOS AYORA — rastreo de paquetes</footer>

      <style jsx global>{`
        .rastreo-shell {
          min-height: 100vh;
          background: radial-gradient(circle at 50% -10%, #1c2333 0%, #0b0e17 55%, #05060a 100%);
          color: #fff;
          display: flex;
          flex-direction: column;
        }
        .rastreo-header {
          padding: 20px 24px;
          display: flex;
          justify-content: center;
        }
        .rastreo-brand img {
          height: 64px;
          border-radius: 10px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
        }
        .rastreo-main {
          flex: 1;
          max-width: 640px;
          width: 100%;
          margin: 0 auto;
          padding: 16px 20px 60px;
        }
        .rastreo-hero-texto {
          text-align: center;
          margin-bottom: 28px;
        }
        .rastreo-eyebrow {
          display: inline-block;
          background: rgba(246, 168, 63, 0.15);
          color: #f6a83f;
          border: 1px solid rgba(246, 168, 63, 0.45);
          border-radius: 999px;
          padding: 5px 14px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }
        .rastreo-hero-texto h1 {
          margin: 0 0 10px;
          font-size: 30px;
          font-weight: 800;
          background: linear-gradient(90deg, #f6a83f 0%, #f6d34a 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .rastreo-hero-texto p {
          margin: 0;
          color: rgba(255, 255, 255, 0.7);
          font-size: 14.5px;
          line-height: 1.5;
        }
        .rastreo-form {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        .rastreo-form input {
          flex: 1;
          padding: 14px 16px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          font-size: 15px;
          margin-bottom: 0;
        }
        .rastreo-form input::placeholder { color: rgba(255, 255, 255, 0.4); }
        .rastreo-form input:focus {
          outline: none;
          border-color: #f6a83f;
        }
        .rastreo-btn {
          padding: 14px 22px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(90deg, #f6a83f 0%, #f6d34a 100%);
          color: #1c1408;
          font-weight: 800;
          font-size: 15px;
          cursor: pointer;
          white-space: nowrap;
        }
        .rastreo-btn:hover { filter: brightness(1.05); }
        .rastreo-btn:disabled { opacity: 0.6; cursor: default; }
        .rastreo-error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fca5a5;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 14px;
          margin-bottom: 16px;
        }
        .rastreo-resultados {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .rastreo-card {
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 20px;
        }
        .rastreo-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 14px;
        }
        .rastreo-guia { font-weight: 700; font-size: 15px; }
        .rastreo-cliente { font-size: 13px; color: rgba(255, 255, 255, 0.6); margin-top: 2px; }
        .rastreo-badge {
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }
        .estado-recibido { background: rgba(59, 130, 246, 0.18); color: #93c5fd; }
        .estado-en_transito { background: rgba(246, 168, 63, 0.18); color: #f6a83f; }
        .estado-listo_entrega { background: rgba(16, 185, 129, 0.18); color: #6ee7b7; }
        .estado-entregado { background: rgba(255, 255, 255, 0.15); color: #fff; }
        .rastreo-foto {
          width: 100%;
          max-height: 220px;
          object-fit: cover;
          border-radius: 10px;
          margin-bottom: 16px;
        }
        .rastreo-timeline {
          display: flex;
          flex-direction: column;
        }
        .rastreo-paso {
          display: flex;
          align-items: flex-start;
          position: relative;
          min-height: 56px;
        }
        .rastreo-punto {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          flex-shrink: 0;
          z-index: 1;
          opacity: 0.45;
        }
        .rastreo-paso.completado .rastreo-punto {
          background: linear-gradient(135deg, #f6a83f 0%, #f6d34a 100%);
          border-color: transparent;
          opacity: 1;
        }
        .rastreo-linea {
          position: absolute;
          left: 16px;
          top: 34px;
          width: 2px;
          height: calc(100% - 20px);
          background: rgba(255, 255, 255, 0.15);
        }
        .rastreo-linea.completado { background: #f6a83f; }
        .rastreo-paso-texto { margin-left: 14px; padding-bottom: 22px; }
        .rastreo-paso-label {
          font-size: 14px;
          font-weight: 700;
          opacity: 0.5;
        }
        .rastreo-paso.completado .rastreo-paso-label { opacity: 1; }
        .rastreo-paso-fecha {
          font-size: 12.5px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 2px;
        }
        .rastreo-footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.35);
        }
      `}</style>
    </div>
  );
}
