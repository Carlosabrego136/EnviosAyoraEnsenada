import { useMemo, useState } from 'react';
import Layout from '../../components/Layout';

// Tabulador oficial 2026 (tal como lo maneja la clienta): por cada peso "techo"
// se muestra el precio de Aéreo, Terrestre y Baja Pack Express. Si el paquete
// pesa menos que un techo pero más que el anterior, se cobra el techo de arriba
// (así es como ella cotiza: "las medidas y peso son variables y van en rangos").
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

function moneda(n) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
}

// Fórmula de peso volumétrico que usa la clienta: (largo × ancho × alto en cm) / 5000.
// Se compara contra el peso real y se cobra el que sea mayor (así lo indica su nota #1).
function calcularVolumetrico(largo, ancho, alto) {
  const l = parseFloat(largo) || 0;
  const a = parseFloat(ancho) || 0;
  const h = parseFloat(alto) || 0;
  if (!l || !a || !h) return 0;
  return (l * a * h) / 5000;
}

function buscarTier(pesoFacturable) {
  if (!pesoFacturable || pesoFacturable <= 0) return null;
  const tier = TABULADOR.find((t) => pesoFacturable <= t.kg);
  return tier || null; // null si pesa más de 60kg (fuera de tabla, cotización especial)
}

export default function Cotizador() {
  const [pesoReal, setPesoReal] = useState('');
  const [largo, setLargo] = useState('');
  const [ancho, setAncho] = useState('');
  const [alto, setAlto] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [numeroCajas, setNumeroCajas] = useState('1');
  const [copiado, setCopiado] = useState(false);

  const volumetrico = useMemo(() => calcularVolumetrico(largo, ancho, alto), [largo, ancho, alto]);
  const real = parseFloat(pesoReal) || 0;
  const pesoFacturable = Math.max(real, volumetrico);
  const tier = buscarTier(pesoFacturable);
  const fueraDeTabla = pesoFacturable > 60;

  function textoCotizacion() {
    if (!tier) return '';
    const cajas = parseInt(numeroCajas, 10) || 1;
    const lineasMedidas =
      largo && ancho && alto ? `Medidas: ${largo}x${ancho}x${alto} cm · Vol. ${volumetrico.toFixed(1)} kg\n` : '';
    return (
      `Hola${clienteNombre ? ' ' + clienteNombre : ''}, que tal.. te dejo cotización de envío\n\n` +
      `${cajas} caja${cajas > 1 ? 's' : ''}${real ? ` · Peso real ${real} kg` : ''}\n` +
      lineasMedidas +
      `\n` +
      `Aéreo (Estafeta/FedEx/DHL): ${moneda(tier.aereo)}\n` +
      `Terrestre (Paquetexpres): ${moneda(tier.terrestre)}\n` +
      `Baja Pack Express: ${moneda(tier.bajapack)}\n\n` +
      `El pago debe quedar a más tardar el día miércoles para que tu envío salga en la misma semana.\n\n` +
      `Pago:\nLunes sale martes\nMartes sale miércoles\nMiércoles sale jueves\n\n` +
      `Tu cotización ya incluye la boleta mínima de aduana para que tu caja pueda salir a destino. Sin embargo, todos los envíos terrestres son susceptibles de ser revisados en la aduana y que el agente aduanal determine pagos de impuestos adicionales; estos corren totalmente por tu cuenta y se deben pagar de manera inmediata para que tu caja siga su curso.\n\n` +
      `Las medidas y el peso son variables y van en rangos, estos precios son orientativos según el tabulador oficial.`
    );
  }

  async function copiarTexto() {
    const texto = textoCotizacion();
    if (!texto) return;
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function enviarWhatsApp() {
    const texto = textoCotizacion();
    if (!texto) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  }

  return (
    <Layout>
      <div className="card">
        <h2>Cotizador de envíos</h2>
        <p style={{ fontSize: 13.5, color: '#6b7280', marginTop: -8 }}>
          Calcula el precio según el tabulador oficial 2026. Se cobra el peso real o el volumétrico
          (el que sea mayor), redondeado al siguiente rango de la tabla.
        </p>

        <div className="grid-2">
          <div>
            <label>Peso real (kg)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={pesoReal}
              onChange={(e) => setPesoReal(e.target.value)}
              placeholder="Ej. 58.7"
            />
          </div>
          <div>
            <label>Número de cajas</label>
            <input
              type="number"
              min="1"
              value={numeroCajas}
              onChange={(e) => setNumeroCajas(e.target.value)}
            />
          </div>
        </div>

        <label>Medidas (cm) — opcional, para calcular el peso volumétrico</label>
        <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <input type="number" min="0" value={largo} onChange={(e) => setLargo(e.target.value)} placeholder="Largo" />
          <input type="number" min="0" value={ancho} onChange={(e) => setAncho(e.target.value)} placeholder="Ancho" />
          <input type="number" min="0" value={alto} onChange={(e) => setAlto(e.target.value)} placeholder="Alto" />
        </div>
        {volumetrico > 0 && (
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: -6 }}>
            Peso volumétrico calculado: <strong>{volumetrico.toFixed(1)} kg</strong>
          </p>
        )}

        <label>Nombre del cliente (opcional, para personalizar el mensaje)</label>
        <input value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="Ej. Rosa González" />
      </div>

      {pesoFacturable > 0 && (
        <div className="card">
          {fueraDeTabla ? (
            <p>
              El peso facturable (<strong>{pesoFacturable.toFixed(1)} kg</strong>) supera los 60 kg que cubre el
              tabulador — esta caja necesita una cotización especial hecha a mano.
            </p>
          ) : (
            <>
              <p style={{ marginTop: 0 }}>
                Peso facturable: <strong>{pesoFacturable.toFixed(1)} kg</strong> → se cobra el rango de{' '}
                <strong>{tier.kg} kg</strong>
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Aéreo</th>
                      <th>Terrestre</th>
                      <th>Baja Pack Express</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{moneda(tier.aereo)}</td>
                      <td>{moneda(tier.terrestre)}</td>
                      <td>{moneda(tier.bajapack)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 14 }}>
                <button className="btn" onClick={copiarTexto}>
                  {copiado ? 'Copiado ✓' : 'Copiar cotización'}
                </button>{' '}
                <button className="btn secondary" onClick={enviarWhatsApp}>
                  Enviar por WhatsApp
                </button>
              </div>

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
                {textoCotizacion()}
              </pre>
            </>
          )}
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
          recolección, almacenamiento, transporte, empaque, sello aduanal y envío. Los envíos están
          sujetos a inspecciones aduanales; cualquier cobro adicional corre por cuenta del cliente.
        </p>
      </div>
    </Layout>
  );
}
