# mini-matomo-node

Ejemplo mínimo inspirado en Matomo: una API de ingesta con Express + MongoDB, un snippet de tracker JS y endpoints de informes sencillos.

## Estructura
- `src/server.js`: arranca Express y monta rutas.
- `src/config/`: carga de variables de entorno y ajustes de Express.
- `src/db/`: conexión a Mongo y utilidades para colecciones.
- `src/core/`: lógica compartida como validaciones y normalizaciones.
- `src/routes/`: rutas de ingesta (`collect`) e informes (`reports`).
- `src/tracker/tracker.js`: script cliente que envía pageviews/eventos.

## Puesta en marcha
1. Instala dependencias dentro de la carpeta:
   ```bash
   cd mini-matomo-node
   npm install
   ```
2. Copia `.env.example` a `.env` y ajusta la URI de MongoDB si es necesario.
3. Ejecuta el servidor:
   ```bash
   npm start
   ```
4. Inserta el tracker en tu HTML:
   ```html
   <script src="http://localhost:4000/tracker.js" data-site-id="demo"></script>
   ```

## Endpoints
- `POST /collect`: recibe eventos con `siteId`, `url`, `referrer`, `eventType`, `timestamp`. El servidor infiere `ip` y `userAgent`.
- `GET /reports/pageviews`: devuelve agregados por día y URL para un `siteId` y rango temporal (`from`, `to`).

## Notas
- Se limita el tamaño del body y se valida `siteId`/`url` para evitar spam.
- El tracker es de tamaño reducido y usa `fetch`; se puede extender con más metadatos o colas.
- La retención de datos o anonimización de IP pueden añadirse sobre `src/core/enrichEvent.js`.
