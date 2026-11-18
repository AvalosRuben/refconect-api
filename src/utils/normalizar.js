// Misma regla que la semilla SQL: upper(regexp_replace(numero_parte, '[^A-Za-z0-9]', '', 'g')).
export function normalizarNumeroParte(texto) {
  return String(texto ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

// Escapa comodines de LIKE/ILIKE (% _ \) para que el texto del usuario se busque literal.
export function escaparLike(texto) {
  return String(texto).replace(/[\\%_]/g, '\\$&');
}
