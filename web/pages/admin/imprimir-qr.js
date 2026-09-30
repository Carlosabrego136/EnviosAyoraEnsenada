import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

// Página para imprimir de un jalón los QR de todos los vendedores y/o
// clientes (en vez de entrar uno por uno a /qr/[tipo]/[id]). Pensada para
// generar las tarjetas/gafetes físicos que se reparten y se escanean después
// en /escanear.
// Tope de tarjetas que se muestran/cargan de un jalón. Los clientes normales
// mandan entre 2 y 20-30 paquetes, así que 30 cubre de sobra ese caso sin
// arriesgarse a que el celular tenga que cargar cientos de QR a la vez (el
// caso raro de más de 300, del bloque 24.5, la clienta dijo que lo puede
// manejar aparte si hace falta).
const LIMITE_TARJETAS = 30;

// Cuántas tarjetas caben en una hoja carta con el tamaño actual del QR (3
// columnas x 3 filas). Antes dejábamos que el navegador repartiera todo el
// listado en las hojas que hicieran falta solo con flexbox + wrap, y en
// computadora funcionaba, pero en el celular de la clienta (Chrome Android)
// el motor de impresión NO reparte el contenido en varias hojas — corta todo
// después de la primera y ni siquiera ofrece más páginas en el diálogo de
// imprimir. Por eso ahora partimos la lista en grupos de este tamaño
// nosotros mismos y forzamos un salto de página entre cada grupo, para que
// no dependa de que el navegador lo calcule bien.
const TARJETAS_POR_HOJA = 9;

export default function ImprimirQr() {
  const [vendedores, setVendedores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrar, setMostrar] = useState('ambos'); // 'ambos' | 'vendedores' | 'clientes'
  const [busqueda, setBusqueda] = useState('');
  // Cuántas imágenes de QR ya terminaron de cargar (o fallaron) de las que se
  // están mostrando ahorita. Mientras no coincida con el total, no dejamos
  // imprimir — así nunca vuelve a pasar que se manden a imprimir QR en blanco
  // porque la imagen no alcanzó a cargar a tiempo.
  const [cargadas, setCargadas] = useState(0);

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

  const tarjetasCoincidentes = useMemo(() => {
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

  // Recortamos a LIMITE_TARJETAS para no cargar/imprimir cientos de QR de
  // golpe. Si hay más coincidencias de las que se muestran, se lo avisamos
  // a quien esté usando la pantalla para que afine la búsqueda.
  const tarjetas = useMemo(
    () => tarjetasCoincidentes.slice(0, LIMITE_TARJETAS),
    [tarjetasCoincidentes]
  );
  const hayMasDeLasMostradas = tarjetasCoincidentes.length > tarjetas.length;

  // Partimos las tarjetas a imprimir en grupos del tamaño de una hoja, para
  // forzar el salto de página nosotros mismos (ver nota de TARJETAS_POR_HOJA).
  const hojas = useMemo(() => {
    const grupos = [];
    for (let i = 0; i < tarjetas.length; i += TARJETAS_POR_HOJA) {
      grupos.push(tarjetas.slice(i, i + TARJETAS_POR_HOJA));
    }
    return grupos;
  }, [tarjetas]);

  // Cada vez que cambia el filtro o la búsqueda, la lista de tarjetas es
  // distinta, así que reiniciamos el contador de imágenes cargadas.
  useEffect(() => {
    setCargadas(0);
  }, [tarjetas]);

  const todasCargadas = tarjetas.length > 0 && cargadas >= tarjetas.length;

  function imprimir() {
    if (!todasCargadas) {
      alert('Espera un momento a que terminen de cargar todos los códigos QR antes de imprimir.');
      return;
    }
    window.print();
  }

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

        <button className="btn" onClick={imprimir} disabled={!todasCargadas}>
          {todasCargadas
            ? `Imprimir (${tarjetas.length})`
            : `Cargando QR... (${cargadas}/${tarjetas.length})`}
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
        <>
          {hayMasDeLasMostradas && (
            <p className="no-imprimir iq-aviso-limite">
              Hay {tarjetasCoincidentes.length} coincidencias, se están mostrando las primeras{' '}
              {LIMITE_TARJETAS}. Afina la búsqueda por nombre para ver o imprimir el resto.
            </p>
          )}
          <div className="iq-hojas">
            {hojas.map((grupo, indiceHoja) => (
              <div className="iq-hoja" key={indiceHoja}>
                {grupo.map((t) => (
                  <div className="iq-tarjeta" key={`${t.tipo}-${t.id}`}>
                    <img src="/logo.jpg" alt="ENVIOS AYORA" className="iq-logo" />
                    <p className="iq-etiqueta">{t.tipo === 'vendedor' ? 'Vendedor' : 'Cliente'}</p>
                    <p className="iq-nombre">{t.nombre}</p>
                    <img
                      src={`/api/qr-imagen?valor=${encodeURIComponent(t.qrCodigo)}`}
                      alt={`Código QR de ${t.nombre}`}
                      className="iq-imagen"
                      onLoad={() => setCargadas((n) => n + 1)}
                      onError={() => setCargadas((n) => n + 1)}
                    />
                    <p className="iq-codigo">{t.qrCodigo}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
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

        .iq-aviso-limite {
          margin: 0;
          padding: 10px 20px;
          background: #fef3c7;
          color: #92400e;
          font-size: 13px;
        }

        .iq-hojas {
          padding: 20px;
        }
        .iq-hoja {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }
        .iq-hoja + .iq-hoja {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 2px dashed #d1d5db;
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

        .iq-barra .btn:disabled {
          opacity: 0.6;
          cursor: default;
        }

        @media print {
          .no-imprimir {
            display: none !important;
          }
          .imprimir-qr-pagina {
            background: #fff;
          }
          .iq-hojas {
            padding: 0;
          }
          /* IMPORTANTE: NO dejamos que el navegador reparta las tarjetas en
             hojas por su cuenta (ni con grid ni con flex se puede confiar en
             eso en todos los celulares/navegadores — a la clienta, en Chrome
             Android, se le cortaba todo después de la primera hoja de 9 y ni
             siquiera ofrecía más páginas). En vez de eso, cada ".iq-hoja" ya
             viene armado desde React con como máximo TARJETAS_POR_HOJA
             tarjetas, y aquí forzamos que cada una sea su propia hoja física
             con un salto de página explícito. */
          .iq-hoja {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            page-break-after: always;
            break-after: page;
          }
          .iq-hoja:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .iq-hoja + .iq-hoja {
            margin-top: 0;
            padding-top: 0;
            border-top: none;
          }
          .iq-tarjeta {
            box-shadow: none;
            border: 1px solid #d1d5db;
            page-break-inside: avoid;
            break-inside: avoid;
            width: 31.5%;
          }
        }
      `}</style>
    </div>
  );
}
