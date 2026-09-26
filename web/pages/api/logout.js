const { logoutCookie } = require('../../lib/auth');

export default function handler(req, res) {
  res.setHeader('Set-Cookie', logoutCookie());
  res.status(200).json({ ok: true });
}
