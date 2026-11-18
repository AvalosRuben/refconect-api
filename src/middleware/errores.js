import { ErrorApi } from '../errores.js';

export function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: { codigo: 'NO_ENCONTRADO', mensaje: 'Ruta no encontrada.' } });
}

// Manejo central: nunca expone trazas ni detalles de SQL al cliente.
// eslint-disable-next-line no-unused-vars
export function manejarErrores(err, req, res, next) {
  if (err instanceof ErrorApi) {
    return res.status(err.estado).json({ error: { codigo: err.codigo, mensaje: err.message } });
  }
  // Errores de body-parser: JSON mal formado o cuerpo demasiado grande.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { codigo: 'PETICION_INVALIDA', mensaje: 'El cuerpo no es JSON válido.' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { codigo: 'PETICION_INVALIDA', mensaje: 'El cuerpo de la petición es demasiado grande.' } });
  }
  console.error(err);
  res.status(500).json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error interno.' } });
}
