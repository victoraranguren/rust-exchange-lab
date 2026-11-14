# 03 · cex-deposits

## Qué construyes
El **servicio de depósitos de TuyCEX**: cada usuario tiene su dirección de depósito en Solana; el servicio detecta lo que llega on-chain y lo acredita en el ledger de `cex-core`.

## Features
1. **Dirección de depósito por usuario** (SOL y USDC).
2. **Watcher** que detecta las transferencias entrantes.
3. **Confirmación**: solo se acredita con commitment `finalized`.
4. **Acreditación idempotente** en el ledger, con historial de depósitos por usuario.

## Base de datos
```
deposit_addresses (user_id, pubkey UNIQUE, created_at)
deposits          (id, signature, user_id, asset, amount, slot, status, detected_at, credited_at)
                  UNIQUE (signature, asset)
sync_cursors      (pubkey PK, last_signature, updated_at)
```
Estados: `detected → finalized → credited`, o `detected → failed`.

## API
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/users/{id}/deposit-address` | crear u obtener la dirección del usuario |
| `GET` | `/users/{id}/deposits` | historial de depósitos con su estado |
| `GET` | `/deposits/{signature}` | detalle de un depósito |
| `GET` | `/health` | lag: slot actual − último slot procesado |

## Requisitos
- **RF1** Detección por polling de `getSignaturesForAddress` desde el cursor y luego `getTransaction` para extraer el monto (SOL por pre/post balances; USDC por pre/post token balances).
- **RF2** Acreditar en el ledger (mismo esquema de `cex-core`) con `reference = signature`.
- **RF3** Una tx fallida (`meta.err != null`) queda en `failed` y no acredita.
- **RF4** Al reiniciar, retomar desde `sync_cursors` sin perder ni duplicar.
- **RF5** Un monto menor al mínimo configurado (`MIN_DEPOSIT`) queda en `ignored`.
- **RNF1** Pipeline de tasks: `detector → confirmer → crediter`, conectadas por canales acotados.
- **RNF2** `Ctrl+C`: dejar de detectar, drenar lo que está en vuelo y salir.
- **RNF3** Pasar a `credited` y acreditar el balance en la misma transacción SQL.
- **Bonus** Detección en tiempo real por WebSocket (`logsSubscribe`) con fallback a polling.

## Criterios de aceptación
- [ ] End-to-end en un validador local o devnet: enviar 2 SOL a la dirección → `credited` y +2 SOL en el balance
- [ ] Procesar la misma firma dos veces → una sola acreditación
- [ ] Matar el proceso a mitad y reiniciar → sin pérdidas ni duplicados
- [ ] Una tx fallida queda en `failed`

## Conceptos a estudiar

### Rust / Axum
- Tokio: `mpsc` acotado, `select!`, `JoinSet`, `CancellationToken`
- Enums como máquinas de estado; `match` exhaustivo para las transiciones
- Futures: qué es `.await`, `Send` en tareas y por qué no sostener un `MutexGuard` a través de un `.await`
- Manejo de errores y panics dentro de tasks (`JoinError`)

### System design
- Entrega **at-least-once** + idempotencia = efecto "exactly-once"
- Checkpoints y cursores para reanudar
- Pipelines productor → consumidor y **backpressure**
- Finalidad y reorgs: por qué esperar a `finalized`
- Outbox pattern (para avisar a otros servicios del depósito)

### Solana
- `getSignaturesForAddress` (paginación `before`/`until`) y `getTransaction`
- `meta.preBalances` / `postBalances` y `preTokenBalances` / `postTokenBalances`
- Slots vs bloques, y `meta.err`

### Matemáticas
- **Autómatas finitos (FSM)**: estados, transiciones válidas y estados absorbentes
- **Teoría de colas**: Ley de Little `L = λ·W` y utilización `ρ = λ/μ` (si `ρ ≥ 1` la cola crece sin límite)
- **Grafos dirigidos**: el pipeline como DAG
- **Diferencias**: depósito = `post − pre` por cuenta; cuidado con el fee del pagador
- **Probabilidad básica**: si cada request falla con probabilidad p, la probabilidad de fallar n veces seguidas es pⁿ

### Lecturas
- [Tokio tutorial](https://tokio.rs/tokio/tutorial): Channels, Select y Graceful shutdown
- *DDIA*, cap. 11 (Stream Processing)
