import { useState } from 'react';
import Layout from '../../components/Layout';

// Tabulador oficial 2026 (tal como lo maneja la clienta): por cada peso "techo"
// se muestra el precio de Aéreo, Terrestre y Baja Pack Express. Si el paquete
// pesa menos que un techo pero más que el anterior, se cobra el techo de
// arriba (así es como ella cotiza: "las medidas y peso son variables y van en
// rangos").
const TABULADOR = [
  { kg: 1, aereo: 950, terrestre: 875, bajapack: 600 },
  { kg: 5, aereo: 1000, terrestre: 910, bajapack: 650 },
  { kg: 10, aereo: 1400, terrestre: 1100, bajapack: 850 },
  { kg: 15, aereo: 1550, terrestre: 1250, bajapack: 1000 },
  { kg: 20, aereo: 1700, terrestre: 1450, bajapack: 1200 },
  { kg: 25, aereo: 2000, terrestre: 1650, bajapack: 1500 },
  { kg: 30, aereo: 2300, terrestre: 1850, bajapack: 1650 },
  { kg: 35, aereo: 2600, terrestre: 2000, bajapack: 1800 },
  { kg: 40, aereo: 2800, terrestre: 2150, bajapack: 2100 },
  { kg: 45, aereo: 3100, terrestre: 2300, bajapack: 2250 },
  { kg: 50, aereo: 3350, terrestre: 2450, bajapack: 2350 },
  { kg: 55, aereo: 3650, terrestre: 2700, bajapack: 2450 },
  { kg: 60, aereo: 3900, terrestre: 2900, bajapack: 2600 },
];

const CARGO_ZONA_EXTENDIDA = 285;

const ORDINALES = ['1ra', '2da', '3ra', '4ta', '5ta', '6ta', '7ma', '8va'];

function cajaVacia() {
  return { largo: '', ancho: '', alto: '', pesoReal: '' };
}

function moneda(n) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
}

// Fórmula de peso volumétrico que usa la clienta: (largo × ancho × alto en cm) / 5000.
// Se compara contra el peso real y se cobra el que sea mayor (nota #1 de su tabulador).
function calcularVolumetrico(largo, ancho, alto) {
  const l = parseFloat(largo) || 0;
  const a = parseFloat(ancho) || 0;
  const h = parseFloat(alto) || 0;
  if (!l || !a || !h) return 0;
  return (l * a * h) / 5000;
}

function buscarTier(pesoFacturable) {
  if (!pesoFacturable || pesoFacturable <= 0) return null;
  return TABULADOR.find((t) => pesoFacturable <= t.kg) || null; // null = pesa más de 60kg
}

export default function Cotizador() {
  const [cajas, setCajas] = useState([cajaVacia()]);
  const [clienteNombre, setClienteNombre] = useState('');
  const [zonaExtendida, setZonaExtendida] = useState(false);
  const [incluirBajaPack, setIncluirBajaPack] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);
  const [avisoCompartir, setAvisoCompartir] = useState('');

  function actualizarCaja(index, campo, valor) {
    setCajas((prev) => prev.map((c, i) => (i === index ? { ...c, [campo]: valor } : c)));
  }

  function agregarCaja() {
    if (cajas.length >= 8) return;
    setCajas((prev) => [...prev, cajaVacia()]);
  }

  function quitarCaja(index) {
    setCajas((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function nuevaCotizacion() {
    setCajas([cajaVacia()]);
    setClienteNombre('');
    setZonaExtendida(false);
    setIncluirBajaPack(false);
    setResultado(null);
    setAvisoCompartir('');
  }

  function calcular() {
    const detalle = cajas.map((c, i) => {
      const real = parseFloat(c.pesoReal) || 0;
      const volumetrico = calcularVolumetrico(c.largo, c.ancho, c.alto);
      const facturable = Math.max(real, volumetrico);
      const tier = buscarTier(facturable);
      return { indice: i, real, volumetrico, facturable, tier, medidas: c };
    });

    const conTier = detalle.filter((d) => d.tier);
    const totalAereo = conTier.reduce((s, d) => s + d.tier.aereo, 0) + (zonaExtendida ? CARGO_ZONA_EXTENDIDA : 0);
    const totalTerrestre = conTier.reduce((s, d) => s + d.tier.terrestre, 0) + (zonaExtendida ? CARGO_ZONA_EXTENDIDA : 0);
    const totalBajaPack = conTier.reduce((s, d) => s + d.tier.bajapack, 0) + (zonaExtendida ? CARGO_ZONA_EXTENDIDA : 0);

    setResultado({
      detalle,
      totalAereo,
      totalTerrestre,
      totalBajaPack,
      zonaExtendida,
      incluirBajaPack,
      clienteNombre,
      fecha: new Date(),
    });
    setAvisoCompartir('');
  }

  function textoCotizacion(r) {
    if (!r) return '';
    const multi = r.detalle.length > 1;
    let texto = `Hola${r.clienteNombre ? ' ' + r.clienteNombre : ''}, que tal.. te dejo cotización de envío.\n\n`;

    r.detalle.forEach((d, i) => {
      const etiqueta = multi ? `${ORDINALES[i] || `${i + 1}a`}. caja` : '1 caja';
      texto += `${etiqueta} · Peso real ${d.real || 0} kg\n`;
      if (d.medidas.largo && d.medidas.ancho && d.medidas.alto) {
        texto += `Medidas: ${d.medidas.largo}x${d.medidas.ancho}x${d.medidas.alto} cm · Vol. ${d.volumetrico.toFixed(1)} kg\n`;
      }
      texto += `Peso facturable: ${d.facturable.toFixed(1)} kg → se cobra el rango de ${d.tier ? d.tier.kg : '60+'} kg\n`;
      if (!d.tier) {
        texto += `⚠️ Esta caja supera los 60 kg del tabulador, necesita cotización especial.\n`;
      } else if (multi) {
        texto += `Aéreo: ${moneda(d.tier.aereo)}  ·  Terrestre: ${moneda(d.tier.terrestre)}`;
        if (r.incluirBajaPack) texto += `  ·  Baja Pack Express: ${moneda(d.tier.bajapack)}`;
        texto += `\n`;
      }
      texto += `\n`;
    });

    texto += `Aéreo: ${moneda(r.totalAereo)}\n`;
    texto += `Terrestre: ${moneda(r.totalTerrestre)}\n`;
    if (r.incluirBajaPack) texto += `Baja Pack Express: ${moneda(r.totalBajaPack)}\n`;

    if (multi) {
      texto += `\nTotal aéreo: ${moneda(r.totalAereo)}\n`;
      texto += `Total terrestre: ${moneda(r.totalTerrestre)}\n`;
      if (r.incluirBajaPack) texto += `Total Baja Pack Express: ${moneda(r.totalBajaPack)}\n`;
    }

    if (r.zonaExtendida) {
      texto += `\n(Incluye cargo de zona extendida de ${moneda(CARGO_ZONA_EXTENDIDA)})\n`;
    }

    texto +=
      `\nNota: checar el C.P. para verificar si hay zona extendida. En caso de que sí, se agregan ${moneda(CARGO_ZONA_EXTENDIDA)} adicionales al servicio.\n` +
      `\nEl pago debe quedar a más tardar el día miércoles para que tu envío salga en la misma semana.\n\n` +
      `Pago:\nDomingo sale lunes\nLunes sale martes\nMartes sale miércoles\nMiércoles sale jueves\n\n` +
      `Tu cotización ya incluye la boleta mínima de aduana para que tu caja pueda salir a destino. Sin embargo, todos los envíos terrestres son susceptibles de ser revisados en la aduana y que el agente aduanal determine pagos de impuestos adicionales; estos corren totalmente por tu cuenta y se deben pagar de manera inmediata para que tu caja siga su curso.\n\n` +
      `Las medidas y el peso son variables y van en rangos, estos precios son orientativos según el tabulador oficial.`;

    return texto;
  }

  async function copiarTexto() {
    const texto = textoCotizacion(resultado);
    if (!texto) return;
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function enviarWhatsApp() {
    const texto = textoCotizacion(resultado);
    if (!texto) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  }

  async function compartirConDatosDePago() {
    const texto = textoCotizacion(resultado);
    if (!texto) return;
    setCompartiendo(true);
    setAvisoCompartir('');
    try {
      const res = await fetch('/datos-pago.jpg');
      const blob = await res.blob();
      const archivo = new File([blob], 'datos-de-pago.jpg', { type: blob.type || 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        await navigator.share({ text: texto, files: [archivo] });
      } else if (navigator.share) {
        await navigator.share({ text: texto });
        setAvisoCompartir('Tu navegador no permite compartir la imagen junto con el texto — se compartió solo el texto. Manda la imagen de datos de pago por separado.');
      } else {
        await navigator.clipboard.writeText(texto);
        setAvisoCompartir('Tu navegador no soporta compartir directo. Copiamos el texto al portapapeles — manda la imagen de datos de pago por separado.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setAvisoCompartir('No se pudo compartir. Intenta de nuevo o comparte el texto y la imagen por separado.');
      }
    } finally {
      setCompartiendo(false);
    }
  }

  return (
    <Layout>
      <div className="card">
        <h2>Cotizador de envíos</h2>
        <p style={{ fontSize: 13.5, color: '#6b7280', marginTop: -8 }}>
          Agrega una o varias cajas (cada una con su propio peso y medidas), calcula, y arma el mensaje
          listo para copiar o enviar por WhatsApp.
        </p>

        {cajas.map((c, i) => {
          const vol = calcularVolumetrico(c.largo, c.ancho, c.alto);
          return (
            <div
              key={i}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: 14,
                marginBottom: 14,
                background: '#f9fafb',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 13.5 }}>
                  {cajas.length > 1 ? `${ORDINALES[i] || `${i + 1}a`}. caja` : 'Caja'}
                </strong>
                {cajas.length > 1 && (
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ padding: '4px 10px', fontSize: 12.5 }}
                    onClick={() => quitarCaja(i)}
                  >
                    Quitar
                  </button>
                )}
              </div>

              <div className="grid-2" style={{ marginTop: 8 }}>
                <div>
                  <label>Peso real (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={c.pesoReal}
                    onChange={(e) => actualizarCaja(i, 'pesoReal', e.target.value)}
                    placeholder="Ej. 53"
                  />
                </div>
                <div>
                  <label>Medidas (cm) — opcional</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="number" min="0" value={c.largo} onChange={(e) => actualizarCaja(i, 'largo', e.target.value)} placeholder="Largo" style={{ marginBottom: 0 }} />
                    <input type="number" min="0" value={c.ancho} onChange={(e) => actualizarCaja(i, 'ancho', e.target.value)} placeholder="Ancho" style={{ marginBottom: 0 }} />
                    <input type="number" min="0" value={c.alto} onChange={(e) => actualizarCaja(i, 'alto', e.target.value)} placeholder="Alto" style={{ marginBottom: 0 }} />
                  </div>
                </div>
              </div>
              {vol > 0 && (
                <p style={{ fontSize: 12.5, color: '#6b7280', margin: '4px 0 0' }}>
                  Peso volumétrico: <strong>{vol.toFixed(1)} kg</strong>
                </p>
              )}
            </div>
          );
        })}

        <button type="button" className="btn secondary" onClick={agregarCaja} disabled={cajas.length >= 8}>
          + Agregar otra caja
        </button>

        <div style={{ marginTop: 16 }}>
          <label>Nombre del cliente (opcional, para personalizar el mensaje)</label>
          <input value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="Ej. Urzula Cisneros" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={zonaExtendida}
              onChange={(e) => setZonaExtendida(e.target.checked)}
              style={{ width: 'auto', margin: 0 }}
            />
            ¿El destino está en zona extendida? (agrega {moneda(CARGO_ZONA_EXTENDIDA)})
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={incluirBajaPack}
              onChange={(e) => setIncluirBajaPack(e.target.checked)}
              style={{ width: 'auto', margin: 0 }}
            />
            ¿Cliente de zona fronteriza? (incluye la opción Baja Pack Express)
          </label>
        </div>

        <div style={{ marginTop: 16 }}>
          <button className="btn" onClick={calcular}>
            Calcular cotización
          </button>{' '}
          <button className="btn secondary" onClick={nuevaCotizacion}>
            Nueva cotización (limpiar)
          </button>
        </div>
      </div>

      {resultado && (
        <div className="card">
          {resultado.detalle.some((d) => !d.tier) && (
            <p style={{ background: '#fef3c7', padding: 10, borderRadius: 8, fontSize: 13.5 }}>
              Una o más cajas superan los 60 kg del tabulador y necesitan cotización especial hecha a mano; el
              total de abajo solo incluye las cajas que sí entran en la tabla.
            </p>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Caja</th>
                  <th>Peso facturable</th>
                  <th>Rango</th>
                  <th>Aéreo</th>
                  <th>Terrestre</th>
                  {resultado.incluirBajaPack && <th>Baja Pack Express</th>}
                </tr>
              </thead>
              <tbody>
                {resultado.detalle.map((d, i) => (
                  <tr key={i}>
                    <td>{resultado.detalle.length > 1 ? ORDINALES[i] || `${i + 1}a` : '1 caja'}</td>
                    <td>{d.facturable.toFixed(1)} kg</td>
                    <td>{d.tier ? `${d.tier.kg} kg` : '—'}</td>
                    <td>{d.tier ? moneda(d.tier.aereo) : 'Cotización especial'}</td>
                    <td>{d.tier ? moneda(d.tier.terrestre) : '—'}</td>
                    {resultado.incluirBajaPack && <td>{d.tier ? moneda(d.tier.bajapack) : '—'}</td>}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700 }}>
                  <td colSpan={3}>Total{resultado.zonaExtendida ? ' (incluye zona extendida)' : ''}</td>
                  <td>{moneda(resultado.totalAereo)}</td>
                  <td>{moneda(resultado.totalTerrestre)}</td>
                  {resultado.incluirBajaPack && <td>{moneda(resultado.totalBajaPack)}</td>}
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button className="btn" onClick={copiarTexto}>
              {copiado ? 'Copiado ✓' : 'Copiar cotización'}
            </button>
            <button className="btn secondary" onClick={enviarWhatsApp}>
              Enviar por WhatsApp (solo texto)
            </button>
            <button className="btn secondary" onClick={compartirConDatosDePago} disabled={compartiendo}>
              {compartiendo ? 'Compartiendo...' : '📎 Compartir con datos de pago'}
            </button>
          </div>
          {avisoCompartir && (
            <p style={{ fontSize: 12.5, color: '#92400e', background: '#fef3c7', padding: 8, borderRadius: 8, marginTop: 8 }}>
              {avisoCompartir}
            </p>
          )}

          <pre
            style={{
              marginTop: 16,
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: 13.5,
              background: '#f9fafb',
              border: '1px solid #eee',
              borderRadius: 8,
              padding: 14,
            }}
          >
            {textoCotizacion(resultado)}
          </pre>

          <p style={{ fontSize: 12.5, color: '#6b7280', marginTop: 10 }}>
            Vista previa de los datos de pago que se adjuntan al compartir:
          </p>
          <img src="/datos-pago.jpg" alt="Datos de pago" style={{ maxWidth: 280, borderRadius: 10, border: '1px solid #eee' }} />
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Tabulador completo</h3>
        <div className="table-wrap">
          <table className="tabla-responsiva">
            <thead>
              <tr>
                <th>Peso (kg)</th>
                <th>Aéreo</th>
                <th>Terrestre</th>
                <th>Baja Pack Express</th>
              </tr>
            </thead>
            <tbody>
              {TABULADOR.map((t) => (
                <tr key={t.kg}>
                  <td data-label="Peso (kg)">{t.kg} kg</td>
                  <td data-label="Aéreo">{moneda(t.aereo)}</td>
                  <td data-label="Terrestre">{moneda(t.terrestre)}</td>
                  <td data-label="Baja Pack Express">{moneda(t.bajapack)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12.5, color: '#6b7280', marginTop: 10 }}>
          La tarifa se determina por el mayor entre el peso físico y el volumétrico. El costo incluye
          recolección, almacenamiento, transporte, empaque, sello aduanal y envío. Baja Pack Express solo
          aplica a clientes de zona fronteriza. Los envíos están sujetos a inspecciones aduanales; cualquier
          cobro adicional corre por cuenta del cliente.
        </p>
      </div>
    </Layout>
  );
}
