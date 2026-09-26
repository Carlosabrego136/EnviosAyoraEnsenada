// Autenticación simple por cookie para el panel admin (usuario/clave en .env.local)
const COOKIE_NAME = 'ayora_admin_session';

function isAuthenticated(req) {
  const cookie = req.headers.cookie || '';
  return cookie.includes(`${COOKIE_NAME}=ok`);
}

function loginCookie() {
  return `${COOKIE_NAME}=ok; HttpOnly; Path=/; Max-Age=${60 * 60 * 12}; SameSite=Lax`;
}

function logoutCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0`;
}

module.exports = { isAuthenticated, loginCookie, logoutCookie, COOKIE_NAME };
