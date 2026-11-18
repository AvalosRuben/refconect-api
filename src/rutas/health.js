import { Router } from 'express';
import { readFileSync } from 'node:fs';
import { pool } from '../db.js';

const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url)));
export const rutasHealth = Router();

rutasHealth.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ estado: 'ok', base_de_datos: 'ok', version });
  } catch {
    res.status(503).json({ estado: 'error', base_de_datos: 'error' });
  }
});
