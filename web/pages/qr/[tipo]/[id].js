// Página para VER e IMPRIMIR el QR de un vendedor o cliente, con su nombre.
// Se abre en la misma pestaña (a diferencia de /api/qr/... que solo entrega la imagen cruda).
import Head from 'next/head';
import Link from 'next/link';
import { query } from '../../../lib/db';

export async function getServerSideProps({ params }) {
  const { tipo, id } = params;

  if (!['vendedor', 'cliente'].includes(tipo)) {
    return { notFound: true };
  }

  const tabla = tipo === 'vendedor' ? 'vendedores' : 'clientes';
  const { rows } = await query(`SELECT * FROM ${tabla} WHERE id = $1`, [id]);

  if (rows.length === 0) {
    return { notFound: true };
  }

  const registro = rows[0];

  return {
    props: {
      tipo,
      id,
      nombre: registro.nombre,
      qrCodigo: registro.qr_codigo,
    },
  };
}

export default function VerQr({ tipo, id, nombre, qrCodigo }) {
  const etiqueta = tipo === 'vendedor' ? 'Vendedor' : 'Cliente';
  const volverHref = tipo === 'vendedor' ? '/admin/vendedores' : '/admin/clientes';

  return (
    <div className="qr-pagina">
      <Head>
        <title>QR de {nombre} — ENVIOS AYORA</title>
      </Head>

      <div className="qr-barra no-imprimir">
        <Link href={volverHref} className="btn secondary">
          ← Volver a {tipo === 'vendedor' ? 'Vendedores' : 'Clientes'}
        </Link>
        <button className="btn" onClick={() => window.print()}>
          Imprimir
        </button>
      </div>

      <div className="qr-tarjeta">
        <img src="/logo.jpg" alt="ENVIOS AYORA" className="qr-logo" />
        <p className="qr-etiqueta">{etiqueta}</p>
        <h1 className="qr-nombre">{nombre}</h1>
        <img src={`/api/qr/${tipo}/${id}`} alt={`Código QR de ${nombre}`} className="qr-imagen" />
        <p className="qr-codigo">{qrCodigo}</p>
      </div>

      <style jsx global>{`
        body {
          background: #fff !important;
        }
        .qr-pagina {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 16px;
          background: #fff;
        }
        .qr-barra {
          width: 100%;
          max-width: 420px;
          display: flex;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .qr-tarjeta {
          width: 100%;
          max-width: 420px;
          border: 2px solid #111827;
          border-radius: 16px;
          padding: 32px 24px;
          text-align: center;
          background: #fff;
        }
        .qr-logo {
          height: 70px;
          width: auto;
          border-radius: 10px;
          margin-bottom: 12px;
        }
        .qr-etiqueta {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 13px;
          font-weight: 700;
          color: #6b7280;
          margin: 0 0 4px;
        }
        .qr-nombre {
          font-size: 24px;
          font-weight: 800;
          margin: 0 0 20px;
          color: #111827;
        }
        .qr-imagen {
          width: 100%;
          max-width: 300px;
          height: auto;
        }
        .qr-codigo {
          margin-top: 16px;
          font-size: 13px;
          color: #6b7280;
          letter-spacing: 0.04em;
        }

        @media print {
          .no-imprimir {
            display: none !important;
          }
          .qr-pagina {
            padding: 0;
          }
          .qr-tarjeta {
            border: none;
          }
        }
      `}</style>
    </div>
  );
}
