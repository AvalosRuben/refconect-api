import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escaparLike, normalizarNumeroParte } from '../src/utils/normalizar.js';

test('normaliza mayúsculas y quita guiones, espacios, puntos y diagonales', () => {
  assert.equal(normalizarNumeroParte('w 712/75'), 'W71275');
  assert.equal(normalizarNumeroParte('W-712 75'), 'W71275');
  assert.equal(normalizarNumeroParte('09.A428.11'), '09A42811');
  assert.equal(normalizarNumeroParte('FR7DC+'), 'FR7DC');
  assert.equal(normalizarNumeroParte(' - / '), '');
  assert.equal(normalizarNumeroParte(undefined), '');
});

test('escapa comodines de LIKE', () => {
  assert.equal(escaparLike('50%_a\\b'), '50\\%\\_a\\\\b');
});
