# 06 · cex-market-data

## Qué construyes
El **servicio de datos de mercado de TuyCEX**: ticker, velas, trades recientes y orderbook en vivo, por REST y WebSocket.

## Features
1. **Ticker 24h**: último precio, variación, máximo, mínimo y volumen.
2. **Velas OHLCV** de 1m, 5m y 1h construidas a partir de los trades.
3. **Feed WebSocket** de trades y del orderbook (snapshot + deltas).
4. **Histórico REST** de velas y trades.

## Base de datos
```
candles (market, interval, open_time, open, high, low, close, volume)   PK (market, interval, open_time)
```
> Los trades vienen de la tabla `trades` de `cex-spot-trading`, o de un generador simulado.

## API
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/markets/SOL-USDC/ticker` | ticker 24h |
| `GET` | `/markets/SOL-USDC/candles?interval=1m&limit=100` | velas |
| `GET` | `/markets/SOL-USDC/trades?limit=50` | trades recientes |
| `GET` | `/ws` | `{"op":"subscribe","channels":["trades:SOL-USDC","book:SOL-USDC","candles:SOL-USDC:1m"]}` |

## Requisitos
- **RF1** Construir las velas en memoria y persistir cada una al cerrar su ventana.
- **RF2** El ticker 24h se actualiza con cada trade, sin recalcular todo desde la DB.
- **RF3** Book por WS: snapshot inicial + deltas con `seq` consecutivo; el cliente puede pedir `resync`.
- **RF4** Ping cada 30 s; se desconecta a quien no responda.
- **RNF1** Un cliente lento no frena a los demás (si se atrasa, se le reenvía un snapshot o se le desconecta).
- **RNF2** Cada mensaje se serializa una sola vez para todos los clientes.
- **RNF3** `GET /metrics` con conexiones activas y mensajes por segundo (middleware propio).

## Criterios de aceptación
- [ ] Test de velas en el borde de una ventana (trade a las 10:00:59.999 vs 10:01:00.000)
- [ ] 1000 clientes WS conectados, con la memoria anotada
- [ ] Un cliente que no lee no afecta la latencia de los demás

## Conceptos a estudiar

### Rust / Axum
- WebSockets en Axum (`WebSocketUpgrade`), split de sink y stream
- `broadcast` (+ `RecvError::Lagged`) y `watch`
- `Arc`, `Bytes` y serializar una sola vez
- `tower::Layer` + `Service` escritos a mano: `poll_ready`, `call` y `Pin<Box<dyn Future>>`

### System design
- Pub/sub y **fan-out**
- Políticas de backpressure: descartar, desconectar o *conflate* (enviar solo el último estado)
- Snapshot + deltas con número de secuencia (detección de huecos)
- Heartbeats y detección de conexiones muertas
- Escalar horizontalmente: varias instancias con Redis pub/sub o NATS

### Matemáticas
- **Agregación de series temporales**: ventanas *tumbling* vs *sliding*
- **Alinear timestamps**: `open_time = t − (t mod Δ)`
- **Estadística descriptiva**: VWAP `Σ(p·q) / Σq`, media móvil y variación porcentual 24h
- **Percentiles de latencia**: p50, p95 y p99, y por qué el promedio engaña
- **Ley de Little** aplicada a los buffers por cliente: cuánta memoria necesitas

### Lecturas
- *DDIA*, cap. 11 (Stream Processing: ventanas)
- [Tower: Inventing the Service trait](https://tokio.rs/blog/2021-05-14-inventing-the-service-trait)
- Gil Tene, *How NOT to Measure Latency* (charla)
