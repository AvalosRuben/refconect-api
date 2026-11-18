// Pruebas de integración: requieren la base levantada con la semilla (docker compose up -d).
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { pool } from '../src/db.js';

const app = crearApp({ registrarPeticiones: false });
let token;
const conToken = (ruta) => request(app).get(ruta).set('Authorization', `Bearer ${token}`);

before(async () => {
  const res = await request(app).post('/v1/auth/login').send({ usuario: 'empleado1', password: 'Refconect2026!' });
  token = res.body.token;
});
after(() => pool.end());

describe('health', () => {
  test('responde ok con la base arriba', async () => {
    const res = await request(app).get('/v1/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { estado: 'ok', base_de_datos: 'ok', version: '1.0.0' });
  });
});

describe('auth', () => {
  test('login correcto devuelve token y usuario', async () => {
    const res = await request(app).post('/v1/auth/login').send({ usuario: 'empleado1', password: 'Refconect2026!' });
    assert.equal(res.status, 200);
    assert.equal(res.body.tipo, 'Bearer');
    assert.equal(res.body.expira_en, 28800);
    assert.ok(res.body.token);
    assert.deepEqual(res.body.usuario, { id: 1, nombre: 'Juan Pérez', usuario: 'empleado1', rol: 'empleado' });
  });

  test('admin también inicia sesión', async () => {
    const res = await request(app).post('/v1/auth/login').send({ usuario: 'admin', password: 'Admin2026!' });
    assert.equal(res.status, 200);
    assert.equal(res.body.usuario.rol, 'admin');
  });

  test('contraseña incorrecta y usuario inexistente dan el mismo 401', async () => {
    for (const cuerpo of [{ usuario: 'empleado1', password: 'mal' }, { usuario: 'nadie', password: 'mal' }]) {
      const res = await request(app).post('/v1/auth/login').send(cuerpo);
      assert.equal(res.status, 401);
      assert.deepEqual(res.body, { error: { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Usuario o contraseña incorrectos.' } });
    }
  });

  test('campos faltantes dan 400', async () => {
    const res = await request(app).post('/v1/auth/login').send({ usuario: 'empleado1' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.codigo, 'PETICION_INVALIDA');
  });

  test('me devuelve el usuario del token', async () => {
    const res = await conToken('/v1/auth/me');
    assert.equal(res.status, 200);
    assert.equal(res.body.usuario.usuario, 'empleado1');
  });

  test('sin token o con token inválido da 401', async () => {
    const sin = await request(app).get('/v1/productos');
    assert.equal(sin.status, 401);
    assert.equal(sin.body.error.codigo, 'NO_AUTORIZADO');
    const malo = await request(app).get('/v1/categorias').set('Authorization', 'Bearer abc');
    assert.equal(malo.status, 401);
  });
});

describe('catálogo', () => {
  test('categorías ordenadas por nombre', async () => {
    const res = await conToken('/v1/categorias');
    const nombres = res.body.datos.map((c) => c.nombre);
    assert.equal(nombres.length, 6);
    assert.deepEqual(nombres, [...nombres].sort((a, b) => a.localeCompare(b, 'es')));
  });

  test('sin q devuelve el catálogo paginado', async () => {
    const res = await conToken('/v1/productos?limite=5&pagina=2');
    assert.equal(res.status, 200);
    assert.equal(res.body.pagina, 2);
    assert.equal(res.body.limite, 5);
    assert.equal(res.body.datos.length, 5);
    assert.ok(res.body.total >= 40);
  });

  test('número de parte con y sin guiones encuentra lo mismo', async () => {
    const ids = [];
    for (const q of ['W71275', 'w 712/75', 'W-712 75']) {
      const res = await conToken(`/v1/productos?q=${encodeURIComponent(q)}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.datos[0].numero_parte, 'W 712/75');
      ids.push(res.body.datos.map((d) => d.id).join(','));
    }
    assert.equal(new Set(ids).size, 1);
  });

  test('coincidencia exacta de número de parte va primero', async () => {
    const res = await conToken('/v1/productos?q=6PK2240');
    assert.equal(res.body.datos[0].numero_parte, '6PK 2240');
  });

  test('búsqueda por marca', async () => {
    const res = await conToken('/v1/productos?q=gates');
    assert.ok(res.body.total > 0);
    assert.ok(res.body.datos.every((d) => d.marca === 'Gates'));
  });

  test('búsqueda por descripción, sin acentos y AND por palabras', async () => {
    const res = await conToken('/v1/productos?q=bujia%20iridio');
    assert.equal(res.body.total, 3);
    assert.ok(res.body.datos.every((d) => d.descripcion === 'Bujía de iridio'));
    // a igual relevancia, mayor existencia primero
    const existencias = res.body.datos.map((d) => d.existencia);
    assert.deepEqual(existencias, [...existencias].sort((a, b) => b - a));
  });

  test('filtro por categoría', async () => {
    const cats = (await conToken('/v1/categorias')).body.datos;
    const frenos = cats.find((c) => c.nombre === 'Frenos');
    const res = await conToken(`/v1/productos?categoria_id=${frenos.id}&limite=50`);
    assert.ok(res.body.total > 0);
    assert.ok(res.body.datos.every((d) => d.categoria === 'Frenos'));
  });

  test('comodines de LIKE se buscan literal', async () => {
    const res = await conToken('/v1/productos?q=%25');
    assert.equal(res.body.total, 0);
  });

  test('parámetros inválidos dan 400', async () => {
    for (const qs of ['limite=51', 'limite=0', 'pagina=abc', 'categoria_id=-3']) {
      const res = await conToken(`/v1/productos?${qs}`);
      assert.equal(res.status, 400, qs);
      assert.equal(res.body.error.codigo, 'PETICION_INVALIDA');
    }
  });
});

describe('detalle', () => {
  test('pieza sin existencia muestra equivalentes ordenados y total del grupo', async () => {
    const busqueda = await conToken('/v1/productos?q=W71275');
    const res = await conToken(`/v1/productos/${busqueda.body.datos[0].id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.existencia, 0);
    assert.equal(res.body.numero_parte_norm, 'W71275');
    assert.equal(res.body.grupo.descripcion, 'Filtro de aceite 1.6L');
    assert.deepEqual(res.body.equivalentes.map((e) => [e.marca, e.existencia]), [['Bosch', 12], ['Fram', 5]]);
    assert.equal(res.body.grupo.existencia_total, 17);
    assert.ok(!res.body.equivalentes.some((e) => e.id === res.body.id));
  });

  test('pieza sin grupo: grupo null y equivalentes vacío', async () => {
    const busqueda = await conToken('/v1/productos?q=T-295');
    const res = await conToken(`/v1/productos/${busqueda.body.datos[0].id}`);
    assert.equal(res.body.grupo, null);
    assert.deepEqual(res.body.equivalentes, []);
  });

  test('id inexistente da 404 e id inválido da 400', async () => {
    const no = await conToken('/v1/productos/999999');
    assert.equal(no.status, 404);
    assert.equal(no.body.error.codigo, 'NO_ENCONTRADO');
    const invalido = await conToken('/v1/productos/abc');
    assert.equal(invalido.status, 400);
  });
});
