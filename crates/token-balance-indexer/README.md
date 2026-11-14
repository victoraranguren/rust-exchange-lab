# 01 · token-balance-indexer

## Qué construyes
Un **indexador de balances de tokens en Solana**: un server + DB que vigila una lista de wallets, guarda sus balances de SOL y SPL tokens cada N segundos y los expone por API.

## Features
1. **Registrar wallets** a vigilar (pubkey + etiqueta).
2. **Indexar cada N segundos** el balance de SOL y de todos los SPL tokens de cada wallet.
3. **Guardar el histórico** (snapshots) para ver cómo cambió un balance en el tiempo.
4. **Consultar por API** el balance actual, el histórico y el total de holders por token.

## Base de datos
```
wallets           (id, pubkey UNIQUE, label, created_at)
tokens            (mint PK, symbol, decimals)
balances          (wallet_id, mint, amount, slot, updated_at)       PK (wallet_id, mint)
balance_snapshots (id, wallet_id, mint, amount, slot, taken_at)
```

## API
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/wallets` | registrar una wallet |
| `GET` | `/wallets` | listar las wallets vigiladas |
| `GET` | `/wallets/{pubkey}/balances` | balances actuales (SOL + tokens) |
| `GET` | `/wallets/{pubkey}/balances/{mint}/history?from=&to=` | histórico de un token |
| `GET` | `/tokens/{mint}/holders?limit=20` | top holders entre las wallets indexadas |
| `GET` | `/health` | estado + segundos desde el último ciclo |

## Requisitos
- **RF1** Pubkeys validadas: base58 que decodifique a 32 bytes; si no → `400`.
- **RF2** SOL con `getBalance`; tokens con `getTokenAccountsByOwner` (programas SPL Token y Token-2022, `jsonParsed`). Si hay varias cuentas del mismo mint, se suman.
- **RF3** Un snapshot solo se guarda si el balance **cambió**.
- **RF4** Si un mint no existe en `tokens`, se registra con sus decimales leídos on-chain.
- **RF5** Si falla la RPC para una wallet, se registra el error y el ciclo sigue con las demás.
- **RNF1** Montos en enteros (unidades base), nunca `f64`.
- **RNF2** El indexer corre en background en el mismo proceso que la API, y `Ctrl+C` apaga ambos limpiamente.
- **RNF3** Configuración por env: `DATABASE_URL`, `RPC_URL` (devnet por defecto), `INDEX_INTERVAL_SECS`.
- **RNF4** El parseo de las respuestas de la RPC se testea sin red.

## Criterios de aceptación
- [ ] Registrar una wallet de devnet, hacer `solana airdrop 1` y ver el cambio en `/balances` y en `/history`
- [ ] Sin cambios entre ciclos → no se crean snapshots nuevos
- [ ] Una wallet con 2 token accounts del mismo mint muestra la suma
- [ ] Pubkey inválida → `400`; RPC caída → el `/health` lo refleja

## Conceptos a estudiar

### Rust / Axum
- Newtypes + `FromStr` + `TryFrom` ("parse, don't validate")
- serde: structs anidados, `rename_all = "camelCase"`, `Option`, tipos genéricos (`RpcResponse<T>`)
- `thiserror` (dominio) vs `anyhow` (borde)
- Axum: `Router`, `State`, `Path`/`Query`/`Json`, `IntoResponse`
- SQLx: pool, migraciones, `query_as!`, `ON CONFLICT DO UPDATE`
- Tokio: `spawn`, `interval`, `select!`, `CancellationToken`

### System design
- Polling vs push (WebSocket / Geyser): coste, latencia y complejidad
- Upserts idempotentes y "guardar solo si cambió" (change detection)
- Rate limits de la RPC: backoff exponencial y concurrencia limitada (`Semaphore`)
- Health checks y métricas de frescura de los datos (lag)

### Solana
- Modelo de cuentas: wallet → token accounts (ATA) → mint
- SPL Token vs Token-2022; lamports y decimales
- Commitment: `processed` / `confirmed` / `finalized`

### Matemáticas
- **Punto fijo**: `monto_humano = unidades / 10^decimales`. Por qué `f64` no representa `0.1` exacto (IEEE 754)
- **Cambio de base**: cómo funciona base58 (divisiones sucesivas, igual que pasar de decimal a binario)
- **Rangos de enteros**: `u64::MAX` en SOL y USDC, y cuándo hace falta `u128`
- **Muestreo de series temporales**: qué cambios te pierdes indexando cada N segundos
- **Complejidad de índices**: B-tree O(log n) y por qué indexar `(wallet_id, mint)`

### Lecturas
- *Zero To Production in Rust*, cap. 1–5
- [Solana docs: Accounts y Tokens](https://solana.com/docs/core)
- *What Every Computer Scientist Should Know About Floating-Point* (Goldberg), la intro
