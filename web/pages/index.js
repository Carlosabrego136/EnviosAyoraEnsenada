import Link from 'next/link';
import Layout from '../components/Layout';

export default function Home() {
  return (
    <Layout>
      <div className="card">
        <h2>Bienvenido</h2>
        <p>Sistema de captura por QR y seguimiento de envíos.</p>
        <p>
          <Link href="/escanear" className="btn">Ir a escanear paquete</Link>{' '}
          <Link href="/admin" className="btn secondary">Ver panel administrativo</Link>
        </p>
      </div>
    </Layout>
  );
}
