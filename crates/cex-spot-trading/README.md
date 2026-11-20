# 04 · cex-spot-trading

## Qué construyes
El **trading spot de TuyCEX** para el par `SOL/USDC`: órdenes, matching engine en memoria, trades y liquidación en el ledger.

## Features
1. **Colocar y cancelar órdenes** limit y market.
2. **Matching engine** con price-time priority.
3. **Liquidación**: cada trade mueve los saldos de comprador y vendedor en el ledger.
4. **Consultas**: órdenes abiertas, historial de trades y orderbook.

## Base de datos
```
markets (symbol PK, base, quote, tick_size, lot_size, maker_fee_bps, taker_fee_bps)
orders  (id, user_id, market, side, type, price, qty, filled, status, created_at)
trades  (id, market, maker_order_id, taker_order_id, price, qty, maker_fee, taker_fee, created_at)
```

## API
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/orders` | colocar orden (bloquea fondos) |
| `DELETE` | `/orders/{id}` | cancelar (desbloquea lo no ejecutado) |
| `GET` | `/users/{id}/orders?status=open` | órdenes del usuario |
| `GET` | `/users/{id}/trades` | historial de trades del usuario |
| `GET` | `/markets/SOL-USDC/orderbook?depth=20` | snapshot del book |

## Requisitos
- **RF1** Price-time priority; el trade se ejecuta al precio del maker.
- **RF2** Llenados parciales y multi-nivel; una market order sin liquidez completa se ejecuta hasta donde pueda y el resto se cancela.
- **RF3** Compra limit: bloquea `price × qty` en USDC. Venta: bloquea `qty` en SOL.
- **RF4** Fees maker/taker cobrados en el asset recibido, que van a la cuenta de fees del sistema.
- **RF5** Validar tick size, lot size y saldo antes de aceptar la orden.
- **RF6** Al arrancar, reconstruir el book en memoria con las órdenes `open` de la DB.
- **RNF1** El engine es una sola task, dueña del book, que recibe comandos por canal (no `Mutex` global).
- **RNF2** Persistir el trade y la liquidación de los balances en una sola transacción SQL.
- **RNF3** Engine: más de 100k órdenes/seg en memoria (benchmark con `criterion`).

## Criterios de aceptación
- [ ] Ana vende 5 SOL @150, Luis compra 3 @151 → trade 3 @150, Ana queda con 2 abiertos y los saldos y fees cuadran exactos
- [ ] Cancelar una orden parcial desbloquea exactamente lo pendiente
- [ ] Property test: el book nunca queda cruzado (`best_bid < best_ask`)
- [ ] Reiniciar el server → el book se reconstruye igual

## Conceptos a estudiar

### Rust / Axum
- `BTreeMap`, `VecDeque`, `HashMap` y su complejidad real
- `Ord`, `PartialOrd`, `std::cmp::Reverse` para ordenar los bids
- **Actor pattern**: una task dueña del estado + `mpsc` para comandos + `oneshot` para respuestas
- Evitar allocations en el camino caliente; `criterion` y `cargo flamegraph`
- `proptest` para property tests

### System design
- Engine **single-threaded y determinista**: por qué los CEX reales lo hacen así
- Event sourcing: reconstruir el estado reproduciendo eventos; snapshot + journal
- Microestructura de mercado: maker/taker, spread, profundidad, price-time priority
- Separar el matching (memoria) de la liquidación (DB) sin perder consistencia

### Matemáticas
- **Estructuras de datos**: árboles balanceados O(log n) y colas FIFO O(1)
- **Aritmética de precios enteros**: `quote = price × qty` con escalado de decimales, y **a favor de quién se redondea**
- **Fees en basis points**: `1 bp = 0.01%` y `fee = amount × bps / 10_000`
- **Invariantes**: `qty = filled + remaining + cancelled`, y book nunca cruzado
- **Promedios ponderados**: precio medio de ejecución `Σ(pᵢ·qᵢ) / Σqᵢ`

### Lecturas
- [How to Build a Fast Limit Order Book](https://web.archive.org/web/20110219163448/http://howtohft.wordpress.com/2011/02/15/how-to-build-a-fast-limit-order-book/)
- *Trading and Exchanges* (Larry Harris), los capítulos sobre order books
- [Alice Ryhl: Actors with Tokio](https://ryhl.io/blog/actors-with-tokio/)
