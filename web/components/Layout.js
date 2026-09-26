import Link from 'next/link';

const VIDEO_FONDO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_051048_5ef213b5-26db-4da8-b604-7ef823760b6b.mp4';

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <video className="bg-video" autoPlay loop muted playsInline preload="auto">
        <source src={VIDEO_FONDO} type="video/mp4" />
      </video>

      <div className="topbar">
        <h1>📦 Envíos Ayora Ensenada</h1>
        <nav>
          <Link href="/admin">Panel</Link>
          <Link href="/escanear">Escanear</Link>
          <Link href="/admin/vendedores">Vendedores</Link>
          <Link href="/admin/clientes">Clientes</Link>
        </nav>
      </div>
      <div className="container">{children}</div>
    </div>
  );
}
