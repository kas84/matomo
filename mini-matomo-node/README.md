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
4. Inserta el tracker en tu HTML (se sirven aliases `/matomo.js` y `/piwik.js`). Puedes definir `window._mmq` antes de cargar el script para configurar el siteId, userId o comandos iniciales como en Matomo:
   ```html
   <script>
     window._mmq = window._mmq || [];
     _mmq.push(['setSiteId', 'demo']);
     _mmq.push(['setUserId', 'user-123']);
     _mmq.push(['trackPageView']);
   </script>
   <script src="http://localhost:4000/tracker.js" data-collector="http://localhost:4000/collect"></script>
   ```

## Endpoints
- `GET /collect`: endpoint de tracking compatible con el píxel de Matomo. Acepta query params como `idsite`/`url`/`urlref`/`action_name` y eventos (`e_c`, `e_a`, `e_n`, `e_v`). Devuelve un gif 1x1 (o `204` si se envía `send_image=0`).
- `POST /collect`: ingesta JSON para pageviews/eventos con `siteId`, `url`, `referrer`, `eventType`, `timestamp` y `metadata`. El servidor infiere `ip`, `userAgent` y `accept-language`.
- `GET /reports/pageviews`: devuelve agregados por día y URL para un `siteId` y rango temporal (`from`, `to`).

## Tests
- Matomo incluye una batería extensa de pruebas PHP/JS; aquí replicamos una mínima cobertura para el tracker y la ingesta usando Vitest.
- Ejecuta los tests JavaScript:
  ```bash
  npm test
  ```

## Notas
- Se limita el tamaño del body y se valida `siteId`/`url` para evitar spam.
- El tracker expone una cola `_mmq` con métodos `trackPageView`, `trackEvent`, `trackGoal`, `trackSiteSearch`, `ping`, además de setters (`setSiteId`, `setUserId`, `setCustomUrl`, `setDocumentTitle`, `setReferrerUrl`). Se autoenvía un pageview si no hay ninguno en la cola inicial.
- La retención de datos o anonimización de IP pueden añadirse sobre `src/core/enrichEvent.js`.
