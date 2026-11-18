-- RefConect · Datos de prueba (ficticios pero verosímiles)
-- Contraseñas: empleado1 / Refconect2026!  ·  admin / Admin2026!
-- Hashes bcrypt cost 10 generados con: npm run semilla:hash -- "Refconect2026!" "Admin2026!"

INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES
  ('Juan Pérez',     'empleado1', '$2b$10$WadDUVtqgS5fPmkor/hueeaEKjZ.1hKcpnYsAl1Q2YGzbHFKGE0Wa', 'empleado'),
  ('Administrador',  'admin',     '$2b$10$9PnpZH6O8ne.apZ7EUI2i.iJDuh4A1QRMIwUpMli6m.5qaBEgSCh.', 'admin');

INSERT INTO marcas (nombre) VALUES
  ('Bosch'), ('Mann-Filter'), ('NGK'), ('Denso'), ('Brembo'), ('Monroe'), ('Gates'), ('Fram');

INSERT INTO categorias (nombre) VALUES
  ('Filtros'), ('Frenos'), ('Encendido'), ('Suspensión'), ('Correas y bandas'), ('Lubricantes');

INSERT INTO grupos_equivalencia (descripcion) VALUES
  ('Filtro de aceite 1.6L'),
  ('Filtro de aceite 2.0L'),
  ('Filtro de aire 2.0L'),
  ('Filtro de combustible en línea'),
  ('Filtro de aire de cabina'),
  ('Bujía de iridio rosca 14 mm'),
  ('Bujía de cobre rosca 14 mm'),
  ('Bobina de encendido tipo lápiz'),
  ('Balatas delanteras cerámicas'),
  ('Disco de freno delantero ventilado'),
  ('Amortiguador delantero de gas'),
  ('Banda serpentina 6 canales');

-- numero_parte_norm se calcula aquí con la misma regla que src/utils/normalizar.js.
-- Casos de prueba:
--   Grupos con pieza principal (la primera listada) en 0 y equivalente con existencia:
--     aceite 1.6L, combustible, bujía de iridio, amortiguador, banda serpentina.
--   Grupo con todas las piezas en 0: balatas delanteras cerámicas.
INSERT INTO productos
  (numero_parte, numero_parte_norm, marca_id, categoria_id, grupo_equivalencia_id, descripcion, existencia, ubicacion)
SELECT v.numero_parte,
       upper(regexp_replace(v.numero_parte, '[^A-Za-z0-9]', '', 'g')),
       m.id, c.id, g.id, v.descripcion, v.existencia, v.ubicacion
FROM (VALUES
  -- Filtro de aceite 1.6L
  ('W 712/75',          'Mann-Filter', 'Filtros', 'Filtro de aceite 1.6L', 'Filtro de aceite', 0, 'P1-A3'),
  ('F 026 407 157',     'Bosch',       'Filtros', 'Filtro de aceite 1.6L', 'Filtro de aceite', 12, 'P1-A4'),
  ('PH 5796',           'Fram',        'Filtros', 'Filtro de aceite 1.6L', 'Filtro de aceite', 5, 'P2-B1'),
  -- Filtro de aceite 2.0L
  ('W 610/3',           'Mann-Filter', 'Filtros', 'Filtro de aceite 2.0L', 'Filtro de aceite roscado', 2, 'P1-A5'),
  ('0 451 103 316',     'Bosch',       'Filtros', 'Filtro de aceite 2.0L', 'Filtro de aceite roscado', 0, 'P1-A6'),
  ('PH-3614',           'Fram',        'Filtros', 'Filtro de aceite 2.0L', 'Filtro de aceite roscado', 9, 'P2-B2'),
  ('150-1000',          'Denso',       'Filtros', 'Filtro de aceite 2.0L', 'Filtro de aceite roscado', 4, 'P2-B3'),
  -- Filtro de aire 2.0L
  ('C 27 009',          'Mann-Filter', 'Filtros', 'Filtro de aire 2.0L', 'Filtro de aire de motor', 3, 'P1-B1'),
  ('F 026 400 287',     'Bosch',       'Filtros', 'Filtro de aire 2.0L', 'Filtro de aire de motor', 0, 'P1-B2'),
  ('CA10755',           'Fram',        'Filtros', 'Filtro de aire 2.0L', 'Filtro de aire de motor', 8, 'P2-B4'),
  ('143-3359',          'Denso',       'Filtros', 'Filtro de aire 2.0L', 'Filtro de aire de motor', 0, 'P2-B5'),
  -- Filtro de combustible
  ('WK 820/17',         'Mann-Filter', 'Filtros', 'Filtro de combustible en línea', 'Filtro de combustible', 0, 'P1-C1'),
  ('F 026 402 834',     'Bosch',       'Filtros', 'Filtro de combustible en línea', 'Filtro de combustible', 2, 'P1-C2'),
  ('G-9735',            'Fram',        'Filtros', 'Filtro de combustible en línea', 'Filtro de combustible', 0, 'P2-C1'),
  -- Filtro de cabina
  ('CU 2442',           'Mann-Filter', 'Filtros', 'Filtro de aire de cabina', 'Filtro de aire de cabina (polen)', 6, 'P1-C3'),
  ('1 987 432 097',     'Bosch',       'Filtros', 'Filtro de aire de cabina', 'Filtro de aire de cabina (polen)', 0, 'P1-C4'),
  ('DCF-121P',          'Denso',       'Filtros', 'Filtro de aire de cabina', 'Filtro de aire de cabina (polen)', 1, 'P2-C2'),
  ('CF10285',           'Fram',        'Filtros', 'Filtro de aire de cabina', 'Filtro de aire de cabina (polen)', 3, 'P2-C3'),
  -- Bujía de iridio
  ('ILZKR7B-11S',       'NGK',         'Encendido', 'Bujía de iridio rosca 14 mm', 'Bujía de iridio', 0, 'P3-A1'),
  ('IK20TT',            'Denso',       'Encendido', 'Bujía de iridio rosca 14 mm', 'Bujía de iridio', 9, 'P3-A2'),
  ('FR7KII33X',         'Bosch',       'Encendido', 'Bujía de iridio rosca 14 mm', 'Bujía de iridio', 4, 'P3-A3'),
  -- Bujía de cobre
  ('BKR5E-11',          'NGK',         'Encendido', 'Bujía de cobre rosca 14 mm', 'Bujía de cobre', 24, 'P3-A4'),
  ('K16PR-U11',         'Denso',       'Encendido', 'Bujía de cobre rosca 14 mm', 'Bujía de cobre', 0, 'P3-A5'),
  ('FR7DC+',            'Bosch',       'Encendido', 'Bujía de cobre rosca 14 mm', 'Bujía de cobre', 2, 'P3-A6'),
  -- Bobina de encendido
  ('673-1302',          'Denso',       'Encendido', 'Bobina de encendido tipo lápiz', 'Bobina de encendido', 1, 'P3-B1'),
  ('U5045',             'NGK',         'Encendido', 'Bobina de encendido tipo lápiz', 'Bobina de encendido', 0, 'P3-B2'),
  ('0 221 504 470',     'Bosch',       'Encendido', 'Bobina de encendido tipo lápiz', 'Bobina de encendido', 5, 'P3-B3'),
  -- Balatas delanteras (todas sin existencia)
  ('P 85 020',          'Brembo',      'Frenos', 'Balatas delanteras cerámicas', 'Balatas delanteras cerámicas', 0, 'P4-A1'),
  ('0 986 494 033',     'Bosch',       'Frenos', 'Balatas delanteras cerámicas', 'Balatas delanteras cerámicas', 0, 'P4-A2'),
  ('GX-1083',           'Monroe',      'Frenos', 'Balatas delanteras cerámicas', 'Balatas delanteras cerámicas', 0, 'P4-A3'),
  -- Disco de freno
  ('09.A428.11',        'Brembo',      'Frenos', 'Disco de freno delantero ventilado', 'Disco de freno delantero', 2, 'P4-A4'),
  ('0 986 479 S13',     'Bosch',       'Frenos', 'Disco de freno delantero ventilado', 'Disco de freno delantero', 5, 'P4-A5'),
  -- Amortiguador
  ('72367',             'Monroe',      'Suspensión', 'Amortiguador delantero de gas', 'Amortiguador delantero de gas', 0, 'P5-A1'),
  ('0 986 SH 9367',     'Bosch',       'Suspensión', 'Amortiguador delantero de gas', 'Amortiguador delantero de gas', 7, 'P5-A2'),
  -- Banda serpentina
  ('K060882',           'Gates',       'Correas y bandas', 'Banda serpentina 6 canales', 'Banda serpentina', 0, 'P6-A1'),
  ('6PK 2240',          'Bosch',       'Correas y bandas', 'Banda serpentina 6 canales', 'Banda serpentina', 11, 'P6-A2'),
  ('6PK2245',           'Denso',       'Correas y bandas', 'Banda serpentina 6 canales', 'Banda serpentina', 2, 'P6-A3'),
  -- Piezas sin grupo de equivalencia
  ('1 987 479 106',     'Bosch',       'Lubricantes', NULL, 'Líquido de frenos DOT 4 500 ml', 14, 'P7-A1'),
  ('L 04 010',          'Brembo',      'Lubricantes', NULL, 'Líquido de frenos DOT 4 1 L', 0, 'P7-A2'),
  ('909020',            'Monroe',      'Suspensión', NULL, 'Base de amortiguador', 6, 'P5-B1'),
  ('38250',             'Gates',       'Correas y bandas', NULL, 'Tensor de banda', 3, 'P6-B1'),
  ('T-295',             'Gates',       'Correas y bandas', NULL, 'Banda de distribución', 1, 'P6-B2')
) AS v(numero_parte, marca, categoria, grupo, descripcion, existencia, ubicacion)
JOIN marcas m ON m.nombre = v.marca
JOIN categorias c ON c.nombre = v.categoria
LEFT JOIN grupos_equivalencia g ON g.descripcion = v.grupo;
