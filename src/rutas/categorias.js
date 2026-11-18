import { Router } from 'express';
import { pool } from '../db.js';

export const rutasCategorias = Router();

rutasCategorias.get('/categorias', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, nombre FROM categorias ORDER BY nombre');
    res.json({ datos: rows });
  } catch (err) {
    next(err);
  }
});
