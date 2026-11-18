import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { noAutorizado } from '../errores.js';

// Valida "Authorization: Bearer <token>" y deja el payload en req.auth.
export function requiereAuth(req, res, next) {
  const [tipo, token] = (req.get('authorization') ?? '').split(' ');
  if (tipo !== 'Bearer' || !token) return next(noAutorizado('Falta el token de acceso.'));
  try {
    req.auth = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    next();
  } catch {
    next(noAutorizado());
  }
}
