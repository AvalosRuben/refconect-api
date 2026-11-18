-- RefConect · Esquema versión 1
-- Catálogo de solo lectura para la app: la API nunca escribe en estas tablas
-- salvo la carga inicial de la semilla.

-- unaccent permite buscar "suspension" y encontrar "Suspensión".
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  usuario       VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,           -- bcrypt, nunca texto plano
  rol           VARCHAR(20)  NOT NULL DEFAULT 'empleado',
  activo        BOOLEAN      NOT NULL DEFAULT true,
  creado_en     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE marcas (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE categorias (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE grupos_equivalencia (
  id          SERIAL PRIMARY KEY,
  descripcion VARCHAR(150) NOT NULL
);

CREATE TABLE productos (
  id                    SERIAL PRIMARY KEY,
  numero_parte          VARCHAR(50)  NOT NULL,
  -- Mayúsculas y solo letras y dígitos (sin guiones, espacios, puntos ni diagonales).
  numero_parte_norm     VARCHAR(50)  NOT NULL,
  marca_id              INTEGER      NOT NULL REFERENCES marcas(id) ON DELETE RESTRICT,
  categoria_id          INTEGER      NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
  grupo_equivalencia_id INTEGER      NULL REFERENCES grupos_equivalencia(id) ON DELETE RESTRICT,
  descripcion           VARCHAR(200) NOT NULL,
  existencia            INTEGER      NOT NULL DEFAULT 0 CHECK (existencia >= 0),
  ubicacion             VARCHAR(30)  NULL,       -- pasillo y anaquel, ej. "P3-A2"
  CONSTRAINT productos_marca_numero_norm_uk UNIQUE (marca_id, numero_parte_norm)
);

-- text_pattern_ops permite usar el índice en búsquedas por prefijo (LIKE 'ABC%').
CREATE INDEX productos_numero_parte_norm_idx ON productos (numero_parte_norm text_pattern_ops);
CREATE INDEX productos_grupo_idx     ON productos (grupo_equivalencia_id);
CREATE INDEX productos_marca_idx     ON productos (marca_id);
CREATE INDEX productos_categoria_idx ON productos (categoria_id);
