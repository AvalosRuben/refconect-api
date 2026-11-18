// Error de la API con el formato único { error: { codigo, mensaje } }.
export class ErrorApi extends Error {
  constructor(estado, codigo, mensaje) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
  }
}

export const peticionInvalida = (mensaje) => new ErrorApi(400, 'PETICION_INVALIDA', mensaje);
export const noAutorizado = (mensaje = 'Token inválido o vencido.') => new ErrorApi(401, 'NO_AUTORIZADO', mensaje);
export const noEncontrado = (mensaje = 'Recurso no encontrado.') => new ErrorApi(404, 'NO_ENCONTRADO', mensaje);
