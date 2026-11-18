# RefConect API

API de **solo consulta** para RefConect: el empleado busca una pieza automotriz por número de parte,
marca o descripción y ve su existencia y sus equivalencias de otras marcas con su existencia.

Prototipo local: corre en una laptop, con datos de prueba y sin conexión al punto de venta.
Ningún endpoint escribe en el catálogo; el único `POST` es el login.

## Requisitos

- Node.js 20 o superior (probado con Node 24)
- Docker con Docker Compose v2

## Arranque rápido

```bash
cp .env.example .env          # cambia JWT_SECRET (openssl rand -hex 32)
npm install
docker compose up -d --wait   # PostgreSQL 16 con esquema y datos de prueba
npm run dev                   # API en http://0.0.0.0:3000/v1
```

Los archivos de `db/` se montan en `/docker-entrypoint-initdb.d`, así que la primera vez que se crea
el volumen se ejecutan `01_esquema.sql` y `02_semilla.sql` automáticamente.

**Puerto 5432 ocupado:** si ya tienes otro PostgreSQL en 5432, cambia en `.env` `DB_PUERTO=5434`
y `DATABASE_URL=postgres://refconect:refconect@localhost:5434/refconect`.

| Script | Qué hace |
|---|---|
| `npm run dev` | API con recarga automática (`node --watch`) |
| `npm start` | API sin recarga |
| `npm test` | Pruebas (`node:test` + `supertest`); requieren la base arriba |
| `npm run db:reset` | Borra el volumen y recrea la base con la semilla |
| `npm run semilla:hash -- "<clave>"` | Genera un hash bcrypt (cost 10) para la semilla |

## Credenciales de prueba

| Usuario | Contraseña | Rol |
|---|---|---|
| `empleado1` | `Refconect2026!` | empleado |
| `admin` | `Admin2026!` | admin |

## Endpoints

Prefijo `/v1`. Salvo `health` y `login`, todos exigen `Authorization: Bearer <token>`.
El contrato completo está en [`openapi.yaml`](openapi.yaml).

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/v1/health` | Estado de la API y de la base (503 si la base no responde) |
| POST | `/v1/auth/login` | Inicia sesión; devuelve JWT (8 h) y usuario |
| GET | `/v1/auth/me` | Usuario del token, consultado en la base |
| GET | `/v1/categorias` | Categorías ordenadas por nombre |
| GET | `/v1/productos?q=&categoria_id=&pagina=&limite=` | Búsqueda paginada (límite máx. 50) |
| GET | `/v1/productos/{id}` | Detalle con grupo y equivalentes |

### Ejemplos con curl

```bash
API=http://localhost:3000/v1

curl $API/health

TOKEN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"usuario":"empleado1","password":"Refconect2026!"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

curl -H "Authorization: Bearer $TOKEN" $API/auth/me
curl -H "Authorization: Bearer $TOKEN" $API/categorias

# Estas tres búsquedas devuelven la misma pieza (W 712/75 de Mann-Filter):
curl -H "Authorization: Bearer $TOKEN" "$API/productos?q=W71275"
curl -H "Authorization: Bearer $TOKEN" --get --data-urlencode "q=w 712/75" $API/productos
curl -H "Authorization: Bearer $TOKEN" --get --data-urlencode "q=W-712 75" $API/productos

curl -H "Authorization: Bearer $TOKEN" "$API/productos?q=gates"            # por marca
curl -H "Authorization: Bearer $TOKEN" --get --data-urlencode "q=bujia iridio" $API/productos  # por descripción
curl -H "Authorization: Bearer $TOKEN" "$API/productos?categoria_id=2&pagina=1&limite=10"

curl -H "Authorization: Bearer $TOKEN" $API/productos/9      # detalle (W 712/75: existencia 0, equivalentes con existencia)
curl -H "Authorization: Bearer $TOKEN" $API/productos/99999  # 404 NO_ENCONTRADO
```

Errores, siempre con el mismo formato:

```json
{ "error": { "codigo": "NO_AUTORIZADO", "mensaje": "Token inválido o vencido." } }
```

Códigos: `PETICION_INVALIDA` (400), `CREDENCIALES_INVALIDAS` (401), `NO_AUTORIZADO` (401),
`NO_ENCONTRADO` (404), `DEMASIADOS_INTENTOS` (429, más de 10 logins por minuto por IP), `ERROR_INTERNO` (500).

## Cómo busca

- **Número de parte:** se normaliza a mayúsculas y solo letras y dígitos (`W-712 75` → `W71275`) y se compara contra
  `productos.numero_parte_norm`, que la semilla calcula con `upper(regexp_replace(numero_parte, '[^A-Za-z0-9]', '', 'g'))`.
- **Marca y descripción:** `ILIKE` con `unaccent` (buscar `suspension` encuentra `Suspensión`).
- Cada palabra de `q` debe coincidir en alguno de los tres campos (AND por palabras).
- Orden: número de parte exacto, luego por prefijo, luego el resto; a igual relevancia, mayor existencia primero.
- Todo va parametrizado; los comodines `%` y `_` del usuario se escapan.
- No se usa `pg_trgm`: con un catálogo de prueba pequeño el `ILIKE` basta. Para un catálogo real, agregar
  `CREATE EXTENSION pg_trgm` y un índice GIN sobre `descripcion`.

## Datos de prueba

42 piezas, 8 marcas, 6 categorías, 12 grupos de equivalencia (2 a 4 piezas de marcas distintas) y 5 piezas sin grupo.
Casos incluidos: 5 grupos donde la pieza principal tiene existencia 0 y una equivalente sí tiene
(ej. `W 712/75`, `WK 820/17`, `ILZKR7B-11S`, `72367`, `K060882`), un grupo con todo en 0 (balatas `P 85 020`)
y existencias variadas (0, 1 a 3, más de 3).

Para volver a los datos originales: `npm run db:reset`.

## Dirección de la API por plataforma

La API escucha en `0.0.0.0:3000`.

| Dónde corre la app | URL base |
|---|---|
| Emulador Android | `http://10.0.2.2:3000` |
| Simulador iOS | `http://localhost:3000` |
| Dispositivo físico (misma red Wi-Fi) | `http://<IP-de-la-laptop>:3000` (ver IP con `ip addr` / `ipconfig`) |

En dispositivo físico, abre el puerto 3000 en el firewall de la laptop si no conecta.

## Verificación del contrato

Con la API arriba, `python3 scripts/verificar_contrato.py openapi.yaml` (requiere PyYAML) compara las
respuestas reales de todos los endpoints contra los esquemas de `openapi.yaml`.

## Seguridad

- Contraseñas con bcrypt (cost 10); mismo mensaje para usuario inexistente y contraseña incorrecta.
- JWT HS256 con `sub`, `rol` y expiración; `JWT_SECRET` solo en `.env` (fuera del repo).
- `helmet`, CORS abierto (solo desarrollo), cuerpo máximo de 10 KB, manejo central de errores sin trazas ni SQL.
- Límite de login en memoria: se reinicia al reiniciar la API y no se comparte entre instancias.
