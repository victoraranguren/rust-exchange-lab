# server: el binario de TuyCEX

## Qué es
El **único ejecutable** del backend. No tiene lógica de negocio: arranca la configuración, la DB y Axum, y **compone** los routers y workers que exporta cada crate de `crates/`.

## Requisitos (los vas sumando a medida que avanzas en los proyectos)
- **RF1** Cargar la configuración desde el entorno (`.env` en desarrollo) y fallar al arrancar si falta algo.
- **RF2** Crear el pool de Postgres y correr las migraciones al iniciar.
- **RF3** Montar el router de cada crate con `nest` bajo su prefijo (`/indexer`, `/cex`, `/deposits`, …).
- **RF4** Lanzar los workers en background de los crates que los tengan (indexer, deposits, withdrawals…).
- **RF5** `GET /health` global, que agregue la salud de cada módulo.
- **RF6** `Ctrl+C` / `SIGTERM` → graceful shutdown: el server deja de aceptar requests y los workers terminan lo que tienen en vuelo.
- **RNF1** `tracing` con un span por request (`tower-http::TraceLayer`), CORS y timeout global.
- **RNF2** Los crates exponen una API pública mínima (por ejemplo, `router()` y `spawn_workers()`); el server **nunca** importa sus internals.

## Conceptos a estudiar
- Composición de `Router` en Axum: `nest`, `merge` y `with_state`, y el sub-state con `FromRef`
- `tokio::signal` + `CancellationToken` para el shutdown coordinado
- Las capas de `tower-http`: `TraceLayer`, `CorsLayer` y `TimeoutLayer`
- Features de Cargo, para compilar el server con solo algunos módulos (opcional)
