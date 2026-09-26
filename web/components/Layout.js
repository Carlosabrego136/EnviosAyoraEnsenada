import Link from 'next/link';

export default function Layout({ children }) {
  return (
    <div>
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
