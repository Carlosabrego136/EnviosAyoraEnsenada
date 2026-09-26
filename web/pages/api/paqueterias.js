const { query } = require('../../lib/db');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { rows } = await query('SELECT * FROM paqueterias ORDER BY nombre ASC');
    return res.status(200).json(rows);
  }
  res.status(405).end();
}
