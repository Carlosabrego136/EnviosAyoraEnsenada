import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

// Página para seleccionar varios vendedores y/o clientes e imprimir de un
// jalón sus tarjetas de QR (en vez de entrar uno por uno a /qr/[tipo]/[id]).
// Pensada para generar las tarjetas/gafetes físicos que se reparten y se
// escanean después en /escanear.
//
// Mismo tamaño de tarjeta que las credenciales y las tarjetas de QR de la
// app de Vendedores (CR80 vertical: 54mm x 85.6mm), para que quepan las
// mismas 9 tarjetas por hoja (3 columnas x 3 filas) igual en las tres
// pantallas.
const TARJETAS_POR_HOJA = 9;

// Las claves de selección combinan tipo + id porque un vendedor y un
// cliente podrían compartir el mismo id (son tablas distintas).
function clave(persona) {
  return `${persona.tipo}:${persona.id}`;
}

export default function ImprimirQr() {
  const [vendedores, setVendedores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrar, setMostrar] = useState('ambos'); // 'ambos' | 'vendedores' | 'clientes'
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState(() => new Set());
  // Claves ("tipo:id") de las imágenes de QR que ya terminaron de cargar (o
  // fallaron) de las que se están mostrando ahorita. Este set SOLO CRECE,
  // nunca se reinicia a mano: antes había un contador que se reiniciaba a 0
  // cada vez que cambiaba la selección, y eso borraba el avance de QR que
  // ya habían cargado, dejando el botón de imprimir atorado en "Cargando
  // QR..." aunque ya estuviera todo listo (mismo bug que ya se corrigió en
  // las pantallas de la app de Vendedores).
  const [imagenesListas, setImagenesListas] = useState(() => new Set());
  // Claves cuyo QR falló al cargarse (problema de conexión al pedir la
  // imagen). Se marca para poder avisar y ofrecer un botón de
  // "Reintentar" en vez de dejarlo así nada más.
  const [erroresCarga, setErroresCarga] = useState(() => new Set());
  const [intentoCarga, setIntentoCarga] = useState(0);

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

  const personas = useMemo(
    () => [
      ...vendedores.map((v) => ({ tipo: 'vendedor', id: v.id, nombre: v.nombre, qrCodigo: v.qr_codigo })),
      ...clientes.map((c) => ({ tipo: 'cliente', id: c.id, nombre: c.nombre, qrCodigo: c.qr_codigo })),
    ],
    [vendedores, clientes]
  );

  const personasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return personas.filter((p) => {
      if (mostrar === 'vendedores' && p.tipo !== 'vendedor') return false;
      if (mostrar === 'clientes' && p.tipo !== 'cliente') return false;
      if (q && !p.nombre.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [personas, mostrar, busqueda]);

  // Las tarjetas a imprimir son las que están marcadas con su casilla, sin
  // importar el filtro o la búsqueda actual — así no se pierde la
  // selección al cambiar entre "Solo vendedores"/"Solo clientes" o al
  // buscar otro nombre. Antes esta pantalla solo dejaba imprimir los
  // primeros 30 resultados de la búsqueda, sin poder elegir exactamente a
  // quién.
  const tarjetas = useMemo(
    () => personas.filter((p) => seleccionados.has(clave(p))),
    [personas, seleccionados]
  );

  const hojas = useMemo(() => {
    const grupos = [];
    for (let i = 0; i < tarjetas.length; i += TARJETAS_POR_HOJA) {
      grupos.push(tarjetas.slice(i, i + TARJETAS_POR_HOJA));
    }
    return grupos;
  }, [tarjetas]);

  const cargadas = useMemo(
    () => tarjetas.filter((p) => imagenesListas.has(clave(p))).length,
    [tarjetas, imagenesListas]
  );

  const todasCargadas = tarjetas.length > 0 && cargadas >= tarjetas.length;

  // Solo los errores de alguien que sigue seleccionado ahorita.
  const erroresVisibles = useMemo(
    () => tarjetas.filter((p) => erroresCarga.has(clave(p))),
    [tarjetas, erroresCarga]
  );

  // Vuelve a intentar cargar solo los QR que fallaron, sin perder los que
  // sí cargaron bien ni la selección actual.
  function reintentarFallidos() {
    if (erroresCarga.size === 0) return;
    setImagenesListas((prev) => {
      const siguiente = new Set(prev);
      erroresCarga.forEach((k) => siguiente.delete(k));
      return siguiente;
    });
    setErroresCarga(new Set());
    setIntentoCarga((n) => n + 1);
  }

  function alternar(persona) {
    const k = clave(persona);
    setSeleccionados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(k)) siguiente.delete(k);
      else siguiente.add(k);
      return siguiente;
    });
  }

  function seleccionarVisibles() {
    setSeleccionados((prev) => {
      const siguiente = new Set(prev);
      personasFiltradas.forEach((p) => siguiente.add(clave(p)));
      return siguiente;
    });
  }

  function quitarSeleccion() {
    setSeleccionados(new Set());
  }

  function imprimir() {
    if (!todasCargadas) {
      alert('Espera un momento a que terminen de cargar todos los códigos QR antes de imprimir.');
      return;
    }
    window.print();
  }

  return (
    <div className="iq-pagina">
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

        <button className="btn secondary" onClick={seleccionarVisibles}>
          Seleccionar todos los que se muestran
        </button>
        <button className="btn secondary" onClick={quitarSeleccion}>
          Quitar selección
        </button>

        <button className="btn" onClick={imprimir} disabled={tarjetas.length === 0 || !todasCargadas}>
          {tarjetas.length === 0
            ? 'Imprimir'
            : todasCargadas
            ? `Imprimir (${tarjetas.length})`
            : `Cargando QR... (${cargadas}/${tarjetas.length})`}
        </button>
      </div>

      {erroresVisibles.length > 0 && (
        <p className="iq-aviso iq-aviso-error no-imprimir">
          {erroresVisibles.length === 1
            ? `No se pudo cargar el QR de "${erroresVisibles[0].nombre}" (problema de conexión).`
            : `No se pudieron cargar ${erroresVisibles.length} códigos QR (problema de conexión).`}{' '}
          <button className="btn secondary iq-btn-reintentar" onClick={reintentarFallidos}>
            Reintentar
          </button>
        </p>
      )}

      <div className="iq-cuerpo no-imprimir">
        {cargando ? (
          <p className="iq-vacio">Cargando...</p>
        ) : personasFiltradas.length === 0 ? (
          <p className="iq-vacio">No hay nadie que coincida con la búsqueda.</p>
        ) : (
          <div className="iq-lista">
            {personasFiltradas.map((p) => (
              <label key={clave(p)} className="iq-fila">
                <input
                  type="checkbox"
                  checked={seleccionados.has(clave(p))}
                  onChange={() => alternar(p)}
                />
                <span className="iq-fila-nombre">{p.nombre}</span>
                <span className={`iq-fila-tipo iq-fila-tipo-${p.tipo}`}>
                  {p.tipo === 'vendedor' ? 'Vendedor' : 'Cliente'}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Las tarjetas a imprimir se generan siempre (ocultas en pantalla con
          height:0, no con display:none, para que las imágenes de los QR
          puedan precargar antes de imprimir sin ocupar espacio visible). */}
      <div className="iq-hojas">
        {hojas.map((grupo, indiceHoja) => (
          <div className="iq-hoja" key={indiceHoja}>
            {grupo.map((p) => (
              <div className="iq-tarjeta" key={clave(p)}>
                <img src="/logo.jpg" alt="ENVIOS AYORA" className="iq-logo" />
                <p className="iq-etiqueta">{p.tipo === 'vendedor' ? 'Vendedor' : 'Cliente'}</p>
                <h1 className="iq-nombre">{p.nombre}</h1>
                <img
                  src={`/api/qr-imagen?valor=${encodeURIComponent(p.qrCodigo)}${
                    intentoCarga > 0 ? `&r=${intentoCarga}` : ''
                  }`}
                  alt={`Código QR de ${p.nombre}`}
                  className="iq-imagen"
                  onLoad={() => {
                    setErroresCarga((prev) => {
                      if (!prev.has(clave(p))) return prev;
                      const siguiente = new Set(prev);
                      siguiente.delete(clave(p));
                      return siguiente;
                    });
                    setImagenesListas((prev) => (prev.has(clave(p)) ? prev : new Set(prev).add(clave(p))));
                  }}
                  onError={() => {
                    setErroresCarga((prev) => (prev.has(clave(p)) ? prev : new Set(prev).add(clave(p))));
                    setImagenesListas((prev) => (prev.has(clave(p)) ? prev : new Set(prev).add(clave(p))));
                  }}
                />
                <p className="iq-codigo">{p.qrCodigo}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      <style jsx global>{`
        body {
          background: #fff !important;
        }
        .iq-pagina {
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
        .iq-filtros input {
          width: auto;
          margin: 0;
        }
        .iq-buscar {
          margin: 0;
          flex: 1;
          min-width: 160px;
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
        .iq-barra .btn:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .iq-aviso {
          margin: 12px 16px 0;
          background: #fef3c7;
          color: #92400e;
          font-size: 13px;
          padding: 10px 14px;
          border-radius: 10px;
        }
        .iq-aviso-error {
          background: #fee2e2;
          color: #991b1b;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .iq-btn-reintentar {
          padding: 6px 12px;
          font-size: 12px;
        }

        .iq-cuerpo {
          padding: 16px;
        }
        .iq-vacio {
          color: #6b7280;
          padding: 10px 4px;
        }
        .iq-lista {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-width: 640px;
        }
        .iq-fila {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 10px 12px;
          flex-wrap: wrap;
          cursor: pointer;
        }
        .iq-fila input {
          width: auto;
          margin: 0;
        }
        .iq-fila-nombre {
          font-weight: 700;
          color: #111827;
        }
        .iq-fila-tipo {
          margin-left: auto;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-radius: 6px;
          padding: 2px 8px;
        }
        .iq-fila-tipo-vendedor {
          color: #33455f;
          background: #eef0f4;
        }
        .iq-fila-tipo-cliente {
          color: #92400e;
          background: #fef3c7;
        }

        /* Oculto SOLO en pantalla, nunca "reactivado" para impresión: antes
           se escondía con una propiedad que se volvía a cambiar justo
           @media print, y ese cambio de último momento es lo que
           confundía al navegador al calcular varias hojas (con pocas
           tarjetas salía bien, pero con selecciones grandes —"seleccionar
           todo"— solo armaba la primera hoja y el resto se perdía o se
           encimaba). Al no tocar nada en @media print, la impresión usa el
           acomodo normal de siempre, sin ningún recálculo de último
           momento. Las imágenes igual precargan con display:none (el
           navegador las pide igual, nomás no se dibujan en pantalla). */
        @media screen {
          .iq-hojas {
            display: none;
          }
        }

        .iq-tarjeta {
          width: 54mm;
          height: 85.6mm;
          border: 1px solid #d1d5db;
          border-radius: 3mm;
          padding: 4mm 4mm;
          text-align: center;
          background: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .iq-logo {
          height: 10mm;
          margin-bottom: 2mm;
          border-radius: 2px;
        }
        .iq-etiqueta {
          margin: 0;
          font-size: 6.5px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #6b7280;
          font-weight: 700;
        }
        .iq-nombre {
          margin: 0;
          font-size: 11px;
          font-weight: 800;
          color: #101a30;
          line-height: 1.15;
        }
        .iq-imagen {
          width: 30mm;
          max-width: 30mm;
          margin: 3mm auto;
        }
        .iq-codigo {
          margin-top: 1mm;
          font-size: 6.5px;
          color: #6b7280;
          word-break: break-all;
        }

        @media print {
          /* ESTA es la causa real de que solo saliera 1 hoja sin importar
             cuántas se seleccionaran: styles/globals.css le pone
             "height: 100%" a <html> y <body> (para que la pantalla normal
             no haga scroll raro). Esa altura fija de "una sola pantalla"
             también se aplicaba al imprimir, y el navegador recortaba todo
             el documento a esa altura (una hoja) en vez de dejarlo crecer
             para varias hojas — por eso siempre salía 1 sola hoja sin
             importar si se seleccionaban 11 o 78. Aquí se anula nada más
             para imprimir. */
          html,
          body {
            height: auto !important;
          }
          /* Define explícitamente el tamaño de hoja y márgenes chicos: sin
             esto cada dispositivo/impresora usa sus propios márgenes por
             default (que varían bastante entre computadora y celular), y
             como las tarjetas miden exactamente 54mm x 85.6mm, un margen
             de más podía hacer que no cupiera la tercera fila completa en
             una sola hoja física — eso es lo que se veía como una hoja
             "incompleta" o con tarjetas que se recorren a la siguiente. */
          @page {
            size: letter;
            margin: 4mm;
          }
          .no-imprimir {
            display: none !important;
          }
          .iq-pagina {
            background: #fff;
          }
          .iq-hoja {
            display: grid;
            grid-template-columns: repeat(3, 54mm);
            grid-auto-rows: 85.6mm;
            gap: 0;
            justify-content: center;
            page-break-after: always;
            break-after: page;
          }
          .iq-hoja:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .iq-tarjeta {
            border: none;
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
