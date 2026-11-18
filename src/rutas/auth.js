import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { pool } from '../db.js';
import { ErrorApi, noAutorizado, peticionInvalida } from '../errores.js';
import { requiereAuth } from '../middleware/auth.js';

const usuarioPublico = (u) => ({ id: u.id, nombre: u.nombre, usuario: u.usuario, rol: u.rol });

// Hash de relleno: compara aunque el usuario no exista, para no revelar cuáles existen por tiempo de respuesta.
const HASH_FALSO = bcrypt.hashSync('no-existe', 10);

// Límite sencillo de intentos de login por IP (contador en memoria, ventana de 1 minuto).
// shortcut: se pierde al reiniciar y no se comparte entre procesos; usar Redis si hay varias instancias.
function limitadorLogin(maximo) {
  const intentos = new Map();
  return (req, res, next) => {
    const ahora = Date.now();
    const registro = intentos.get(req.ip);
    if (!registro || ahora - registro.inicio > 60_000) {
      intentos.set(req.ip, { inicio: ahora, cuenta: 1 });
      return next();
    }
    registro.cuenta += 1;
    if (registro.cuenta > maximo) {
      return next(new ErrorApi(429, 'DEMASIADOS_INTENTOS', 'Demasiados intentos de inicio de sesión. Espera un minuto.'));
    }
    next();
  };
}

export function crearRutasAuth() {
  const rutas = Router();

  rutas.post('/auth/login', limitadorLogin(config.loginMaxIntentosPorMinuto), async (req, res, next) => {
    try {
      const { usuario, password } = req.body ?? {};
      if (typeof usuario !== 'string' || !usuario.trim() || typeof password !== 'string' || !password) {
        throw peticionInvalida('Los campos "usuario" y "password" son obligatorios.');
      }
      const { rows } = await pool.query(
        'SELECT id, nombre, usuario, password_hash, rol, activo FROM usuarios WHERE usuario = $1',
        [usuario.trim()],
      );
      const u = rows[0];
      const valida = await bcrypt.compare(password, u?.password_hash ?? HASH_FALSO);
      if (!u || !valida || !u.activo) {
        throw new ErrorApi(401, 'CREDENCIALES_INVALIDAS', 'Usuario o contraseña incorrectos.');
      }
      const token = jwt.sign({ rol: u.rol }, config.jwtSecret, {
        subject: String(u.id),
        expiresIn: config.jwtExpiraSegundos,
        algorithm: 'HS256',
      });
      res.json({ token, tipo: 'Bearer', expira_en: config.jwtExpiraSegundos, usuario: usuarioPublico(u) });
    } catch (err) {
      next(err);
    }
  });

  rutas.get('/auth/me', requiereAuth, async (req, res, next) => {
    try {
      const id = Number(req.auth.sub);
      const { rows } = await pool.query(
        'SELECT id, nombre, usuario, rol FROM usuarios WHERE id = $1 AND activo',
        [Number.isInteger(id) ? id : 0],
      );
      if (!rows[0]) throw noAutorizado('El usuario ya no existe o está inactivo.');
      res.json({ usuario: usuarioPublico(rows[0]) });
    } catch (err) {
      next(err);
    }
  });

  return rutas;
}
