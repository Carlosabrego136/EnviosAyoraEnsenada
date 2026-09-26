const { loginCookie } = require('../../lib/auth');

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { usuario, clave } = req.body;

  const okUser = usuario === process.env.ADMIN_USER;
  const okPass = clave === process.env.ADMIN_PASSWORD;

  if (okUser && okPass) {
    res.setHeader('Set-Cookie', loginCookie());
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: 'Usuario o clave incorrectos' });
}
