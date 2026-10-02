const { query } = require('../../../lib/db');

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const { nombre, telefono, domicilio, facebook, referencia, paqueteria, numero_cajas, kilos } = req.body;
    const { rows } = await query(
      `UPDATE registros_clientes
       SET nombre = COALESCE($1, nombre),
           telefono = COALESCE($2, telefono),
           domicilio = COALESCE($3, domicilio),
           facebook = COALESCE($4, facebook),
           referencia = COALESCE($5, referencia),
           paqueteria = COALESCE($6, paqueteria),
           numero_cajas = COALESCE($7, numero_cajas),
           kilos = COALESCE($8, kilos)
       WHERE id = $9
       RETURNING *`,
      [
        nombre ?? null,
        telefono ?? null,
        domicilio ?? null,
        facebook ?? null,
        referencia ?? null,
        paqueteria ?? null,
        numero_cajas ?? null,
        kilos ?? null,
        id,
      ]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Registro no encontrado' });
    return res.status(200).json(rows[0]);
  }

  if (req.method === 'DELETE') {
    const { rows } = await query('DELETE FROM registros_clientes WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Registro no encontrado' });
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
