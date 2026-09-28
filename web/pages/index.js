import Link from 'next/link';
import Layout from '../components/Layout';

const ACCIONES = [
  {
    href: '/escanear',
    icono: '📷',
    titulo: 'Escanear paquete',
    texto: 'Captura vendedor y cliente en segundos con la cámara.',
    clase: 'accion-naranja',
  },
  {
    href: '/admin',
    icono: '📊',
    titulo: 'Panel administrativo',
    texto: 'Consulta y da seguimiento a todos tus envíos.',
    clase: 'accion-azul',
  },
  {
    href: '/admin/vendedores',
    icono: '🧑‍💼',
    titulo: 'Vendedores',
    texto: 'Da de alta vendedores y genera su código QR.',
    clase: 'accion-morado',
  },
  {
    href: '/admin/clientes',
    icono: '📦',
    titulo: 'Clientes',
    texto: 'Administra tus clientes y sus datos de contacto.',
    clase: 'accion-amarillo',
  },
  {
    href: '/admin/cotizador',
    icono: '💲',
    titulo: 'Cotizador',
    texto: 'Calcula el precio de un envío según el tabulador oficial.',
    clase: 'accion-plata',
  },
  {
    href: '/admin/bloques',
    icono: '🗂️',
    titulo: 'Bloques',
    texto: 'Agrega, renombra o elimina los bloques/categorías tú mismo.',
    clase: 'accion-plata',
  },
];

export default function Home() {
  return (
    <Layout>
      <section className="hero">
        <span className="hero-eyebrow">Sistema de envíos</span>
        <h1 className="hero-title">ENVIOS AYORA</h1>
        <p className="hero-subtitle">
          Captura por código QR, organización por bloques y seguimiento de tus
          paquetes, todo en un solo lugar.
        </p>
        <div className="hero-cta">
          <Link href="/escanear" className="btn btn-hero">Ir a escanear paquete</Link>
          <Link href="/admin" className="btn btn-hero secondary">Ver panel administrativo</Link>
        </div>
      </section>

      <div className="acciones-grid">
        {ACCIONES.map((a) => (
          <Link key={a.href} href={a.href} className={`accion-card ${a.clase}`}>
            <span className="accion-icono">{a.icono}</span>
            <h3>{a.titulo}</h3>
            <p>{a.texto}</p>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
