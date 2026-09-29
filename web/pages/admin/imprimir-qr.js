import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

// Página para imprimir de un jalón los QR de todos los vendedores y/o
// clientes (en vez de entrar uno por uno a /qr/[tipo]/[id]). Pensada para
// generar las tarjetas/gafetes físicos que se reparten y se escanean después
// en /escanear.
export default function ImprimirQr() {
  const [vendedores, setVendedores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrar, setMostrar] = useState('ambos'); // 'ambos' | 'vendedores' | 'clientes'
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      const [vRes, cRes] = await Promise.all([fetch('/api/vendedores'), fetch('/api/clientes')]);
      setVendedores(await vRes.json());
      setClientes(await cRes.json());
      setCargando(false);
    }
    cargar();
  }, []);

  const tarjetas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const deVendedores =
      mostrar === 'clientes'
        ? []
        : vendedores
            .filter((v) => !q || v.nombre.toLowerCase().includes(q))
            .map((v) => ({ tipo: 'vendedor', id: v.id, nombre: v.nombre, qrCodigo: v.qr_codigo }));
    const deClientes =
      mostrar === 'vendedores'
        ? []
        : clientes
            .filter((c) => !q || c.nombre.toLowerCase().includes(q))
            .map((c) => ({ tipo: 'cliente', id: c.id, nombre: c.nombre, qrCodigo: c.qr_codigo }));
    return [...deVendedores, ...deClientes];
  }, [vendedores, clientes, mostrar, busqueda]);

  return (
    <div className="imprimir-qr-pagina">
      <Head>
        <title>Imprimir QR — ENVIOS AYORA</title>
      </Head>

      <div className="iq-barra no-imprimir">
        <Link href="/admin" className="btn secondary">
          ← Volver al panel
        </Link>

        <div className="iq-filtros">
          <label>
            <input
              type="radio"
              name="mostrar"
              checked={mostrar === 'ambos'}
              onChange={() => setMostrar('ambos')}
            />{' '}
            Vendedores y clientes
          </label>
          <label>
            <input
              type="radio"
              name="mostrar"
              checked={mostrar === 'vendedores'}
              onChange={() => setMostrar('vendedores')}
            />{' '}
            Solo vendedores
          </label>
          <label>
            <input
              type="radio"
              name="mostrar"
              checked={mostrar === 'clientes'}
              onChange={() => setMostrar('clientes')}
            />{' '}
            Solo clientes
          </label>
        </div>

        <input
          className="iq-buscar"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre..."
        />

        <button className="btn" onClick={() => window.print()}>
          Imprimir ({tarjetas.length})
        </button>
      </div>

      {cargando ? (
        <p className="no-imprimir" style={{ padding: 20 }}>
          Cargando...
        </p>
      ) : tarjetas.length === 0 ? (
        <p className="no-imprimir" style={{ padding: 20 }}>
          No hay nadie que coincida con la búsqueda.
        </p>
      ) : (
        <div className="iq-hoja">
          {tarjetas.map((t) => (
            <div className="iq-tarjeta" key={`${t.tipo}-${t.id}`}>
              <img src="/logo.jpg" alt="ENVIOS AYORA" className="iq-logo" />
              <p className="iq-etiqueta">{t.tipo === 'vendedor' ? 'Vendedor' : 'Cliente'}</p>
              <p className="iq-nombre">{t.nombre}</p>
              <img
                src={`/api/qr-imagen?valor=${encodeURIComponent(t.qrCodigo)}`}
                alt={`Código QR de ${t.nombre}`}
                className="iq-imagen"
                loading="lazy"
              />
              <p className="iq-codigo">{t.qrCodigo}</p>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        .imprimir-qr-pagina {
          min-height: 100vh;
          background: #f3f4f6;
        }
        .iq-barra {
          position: sticky;
          top: 0;
          z-index: 5;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 14px;
          background: #111827;
          color: #fff;
          padding: 12px 16px;
        }
        .iq-filtros {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          font-size: 13.5px;
        }
        .iq-filtros label {
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
        }
        .iq-buscar {
          margin: 0;
          max-width: 220px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #374151;
        }
        .iq-barra .btn.secondary {
          background: #1f2937;
          color: #fff;
          border: 1px solid #374151;
        }

        .iq-hoja {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
          padding: 20px;
        }

        .iq-tarjeta {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
          break-inside: avoid;
        }
        .iq-logo {
          width: 90px;
          margin: 0 auto 8px;
          display: block;
          border-radius: 6px;
        }
        .iq-etiqueta {
          margin: 0;
          font-size: 11.5px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #6b7280;
          font-weight: 700;
        }
        .iq-nombre {
          margin: 4px 0 10px;
          font-size: 16px;
          font-weight: 700;
          color: #111827;
        }
        .iq-imagen {
          width: 150px;
          height: 150px;
          display: block;
          margin: 0 auto 8px;
        }
        .iq-codigo {
          margin: 0;
          font-size: 11.5px;
          color: #6b7280;
          word-break: break-all;
        }

        @media print {
          .no-imprimir {
            display: none !important;
          }
          .imprimir-qr-pagina {
            background: #fff;
          }
          .iq-hoja {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            padding: 0;
          }
          .iq-tarjeta {
            box-shadow: none;
            border: 1px solid #d1d5db;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
