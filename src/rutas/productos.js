import { Router } from 'express';
import { pool } from '../db.js';
import { noEncontrado, peticionInvalida } from '../errores.js';
import { escaparLike, normalizarNumeroParte } from '../utils/normalizar.js';

export const rutasProductos = Router();

const LIMITE_POR_DEFECTO = 20;
const LIMITE_MAXIMO = 50;
const LARGO_MAXIMO_Q = 100;

// Entero positivo desde un query param; undefined si no viene.
function enteroPositivo(valor, nombre) {
  if (valor === undefined || valor === '') return undefined;
  if (typeof valor !== 'string' || !/^\d+$/.test(valor) || Number(valor) < 1) {
    throw peticionInvalida(`El parámetro "${nombre}" debe ser un entero positivo.`);
  }
  return Number(valor);
}

// Todo el texto del usuario viaja como parámetro ($n); nunca se concatena en el SQL.
// $1 = q normalizada completa, $2 = palabras (escapadas para ILIKE), $3 = palabras normalizadas, $4 = categoria_id.
const FILTRO = `
  FROM productos p
  JOIN marcas m ON m.id = p.marca_id
  JOIN categorias c ON c.id = p.categoria_id
  WHERE ($4::int IS NULL OR p.categoria_id = $4)
    AND (
      cardinality($2::text[]) = 0
      -- La q completa coincide con un número de parte ("W-712 75" → "W71275").
      OR ($1 <> '' AND p.numero_parte_norm LIKE '%' || $1 || '%')
      -- O cada palabra coincide en número de parte, marca o descripción (AND por palabras).
      OR NOT EXISTS (
        SELECT 1 FROM unnest($2::text[], $3::text[]) AS w(texto, norm)
        WHERE NOT (
          (w.norm <> '' AND p.numero_parte_norm LIKE '%' || w.norm || '%')
          OR unaccent(m.nombre) ILIKE '%' || unaccent(w.texto) || '%'
          OR unaccent(p.descripcion) ILIKE '%' || unaccent(w.texto) || '%'
        )
      )
    )`;

rutasProductos.get('/productos', async (req, res, next) => {
  try {
    const { q: qCruda } = req.query;
    if (qCruda !== undefined && typeof qCruda !== 'string') throw peticionInvalida('El parámetro "q" debe ser texto.');
    const q = (qCruda ?? '').trim();
    if (q.length > LARGO_MAXIMO_Q) throw peticionInvalida(`El parámetro "q" admite máximo ${LARGO_MAXIMO_Q} caracteres.`);

    const categoriaId = enteroPositivo(req.query.categoria_id, 'categoria_id') ?? null;
    const pagina = enteroPositivo(req.query.pagina, 'pagina') ?? 1;
    const limite = enteroPositivo(req.query.limite, 'limite') ?? LIMITE_POR_DEFECTO;
    if (limite > LIMITE_MAXIMO) throw peticionInvalida(`El parámetro "limite" admite máximo ${LIMITE_MAXIMO}.`);

    const palabras = q ? q.split(/\s+/) : [];
    const params = [normalizarNumeroParte(q), palabras.map(escaparLike), palabras.map(normalizarNumeroParte), categoriaId];

    const orden = q
      ? `CASE WHEN $1 <> '' AND p.numero_parte_norm = $1 THEN 0
              WHEN $1 <> '' AND p.numero_parte_norm LIKE $1 || '%' THEN 1
              ELSE 2 END,
         p.existencia DESC, m.nombre, p.numero_parte`
      : 'm.nombre, p.numero_parte';

    const [conteo, datos] = await Promise.all([
      pool.query(`SELECT count(*)::int AS total ${FILTRO}`, params),
      pool.query(
        `SELECT p.id, p.numero_parte, m.nombre AS marca, c.nombre AS categoria, p.descripcion,
                p.existencia, p.ubicacion,
                EXISTS (SELECT 1 FROM productos o
                        WHERE o.grupo_equivalencia_id = p.grupo_equivalencia_id AND o.id <> p.id) AS tiene_equivalentes
         ${FILTRO}
         ORDER BY ${orden}
         LIMIT $5 OFFSET $6`,
        [...params, limite, (pagina - 1) * limite],
      ),
    ]);

    res.json({ datos: datos.rows, pagina, limite, total: conteo.rows[0].total });
  } catch (err) {
    next(err);
  }
});

rutasProductos.get('/productos/:id', async (req, res, next) => {
  try {
    const id = enteroPositivo(req.params.id, 'id');
    // Evita desbordar INTEGER de PostgreSQL con ids enormes.
    if (id > 2147483647) throw noEncontrado('El producto no existe.');

    const { rows } = await pool.query(
      `SELECT p.id, p.numero_parte, p.numero_parte_norm, m.nombre AS marca, c.nombre AS categoria,
              p.descripcion, p.existencia, p.ubicacion, p.grupo_equivalencia_id,
              g.descripcion AS grupo_descripcion
       FROM productos p
       JOIN marcas m ON m.id = p.marca_id
       JOIN categorias c ON c.id = p.categoria_id
       LEFT JOIN grupos_equivalencia g ON g.id = p.grupo_equivalencia_id
       WHERE p.id = $1`,
      [id],
    );
    const p = rows[0];
    if (!p) throw noEncontrado('El producto no existe.');

    let grupo = null;
    let equivalentes = [];
    if (p.grupo_equivalencia_id !== null) {
      const eq = await pool.query(
        `SELECT p.id, p.numero_parte, m.nombre AS marca, p.descripcion, p.existencia, p.ubicacion
         FROM productos p JOIN marcas m ON m.id = p.marca_id
         WHERE p.grupo_equivalencia_id = $1 AND p.id <> $2
         ORDER BY p.existencia DESC, m.nombre`,
        [p.grupo_equivalencia_id, p.id],
      );
      equivalentes = eq.rows;
      const existenciaTotal = equivalentes.reduce((suma, e) => suma + e.existencia, p.existencia);
      grupo = { id: p.grupo_equivalencia_id, descripcion: p.grupo_descripcion, existencia_total: existenciaTotal };
    }

    res.json({
      id: p.id,
      numero_parte: p.numero_parte,
      numero_parte_norm: p.numero_parte_norm,
      marca: p.marca,
      categoria: p.categoria,
      descripcion: p.descripcion,
      existencia: p.existencia,
      ubicacion: p.ubicacion,
      grupo,
      equivalentes,
    });
  } catch (err) {
    next(err);
  }
});
