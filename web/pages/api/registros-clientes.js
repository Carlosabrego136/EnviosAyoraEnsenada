const { query } = require('../../lib/db');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { rows } = await query(
      `SELECT * FROM registros_clientes ORDER BY creado_en DESC`
    );
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { nombre, telefono, domicilio, facebook, referencia, paqueteria, numero_cajas, kilos } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'nombre es requerido' });

    const { rows } = await query(
      `INSERT INTO registros_clientes
         (nombre, telefono, domicilio, facebook, referencia, paqueteria, numero_cajas, kilos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        nombre.trim(),
        telefono || null,
        domicilio || null,
        facebook || null,
        referencia || null,
        paqueteria || null,
        numero_cajas === '' || numero_cajas === undefined ? null : numero_cajas,
        kilos === '' || kilos === undefined ? null : kilos,
      ]
    );
    return res.status(201).json(rows[0]);
  }

  res.status(405).end();
}
