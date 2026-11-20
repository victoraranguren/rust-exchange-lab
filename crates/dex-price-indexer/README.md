# 06 · dex-price-indexer

## Qué construyes
Un **indexador de precios on-chain**: lee las reservas de pools AMM en Solana, calcula los precios de los tokens, guarda el histórico y cotiza swaps. TuyCEX lo usa como precio de referencia.

## Features
1. **Registrar pools** a indexar (address, DEX, fee).
2. **Indexar reservas bajo demanda** (al invocar la función o `POST /pools/sync`) con una sola llamada `getMultipleAccounts`.
3. **Precio por token** (spot + TWAP de 5 min) y su histórico.
4. **Quote de swap**: el mejor pool para `amount_in`, con price impact y fee.

## Base de datos
```
pools          (address PK, dex, mint_a, mint_b, vault_a, vault_b, fee_bps)
pool_snapshots (pool, reserve_a, reserve_b, slot, taken_at)
prices         (mint, quote_mint, price_num, price_den, slot, taken_at)
```

## API
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/pools` | registrar un pool |
| `POST` | `/pools/sync` | sincronizar reservas de los pools bajo demanda |
| `GET` | `/prices/{mint}` | precio spot y TWAP 5m en USDC |
| `GET` | `/prices/{mint}/history?interval=1m` | histórico |
| `GET` | `/quote?in=SOL&out=USDC&amount=10` | mejor pool, `amount_out`, impact, fee |

## Requisitos
- **RF1** Leer los vaults del pool (token accounts) y deserializar el monto desde los bytes crudos de la cuenta.
- **RF2** AMM de producto constante:
  `amount_out = reserve_out · in_fee / (reserve_in + in_fee)`, con `in_fee = amount_in · (10000 − fee_bps) / 10000`
- **RF3** El precio de un token es la mediana entre sus pools con liquidez mayor a un mínimo configurable.
- **RF4** Pools sin actualizar en más de 30 s quedan como `stale` y no se usan.
- **RNF1** Cálculo en `u128`, redondeando `amount_out` hacia abajo.
- **RNF2** Agregar otro tipo de pool no obliga a tocar los handlers.
- **RNF3** Cotizar contra 10k pools en memoria en menos de 1 ms.

## Criterios de aceptación
- [ ] El quote coincide con el de un DEX real (±1 unidad base) para el mismo pool y slot
- [ ] Property test: `amount_out < reserve_out` y `k` nunca disminuye
- [ ] Un pool `stale` queda excluido del precio y del quote
- [ ] Benchmark de RNF3 anotado

## Conceptos a estudiar

### Rust / Axum
- Bytes → structs: `u64::from_le_bytes`, `bytemuck`, `borsh`, y slices con `try_into`
- `u128` y checked math
- Trait `Pool`: `Box<dyn Pool>` vs generics (dispatch dinámico vs estático)
- `Cow` y lifetimes para no copiar los datos de las cuentas
- Benchmarks y profiling

### System design
- Batching de lecturas (`getMultipleAccounts`, máximo 100 cuentas por llamada)
- Datos *stale* y TTLs
- Diseño de oráculos: resistencia a manipulación (mediana, TWAP, liquidez mínima)
- Cachés en memoria con snapshots persistidos

### Solana
- Layout de una token account (el `amount` es un u64 little-endian en el offset 64)
- Cuentas de pool de un DEX (Raydium CPMM / Orca) y sus vaults
- PDAs: cómo se derivan las direcciones de los pools

### Matemáticas
- **AMM de producto constante**: derivar `amount_out` a partir de `(x + Δx)·(y − Δy) = k`
- **Cálculo diferencial**: el precio marginal es la derivada `dy/dx = y/x`; el price impact es la diferencia entre el precio marginal y el promedio
- **TWAP**: media ponderada en el tiempo, `(1/T)·∫p(t)dt` ≈ `Σ pᵢ·Δtᵢ / Σ Δtᵢ`
- **Estadística robusta**: por qué la mediana resiste outliers y la media no
- **Números racionales**: guardar el precio como `num/den` para no perder precisión
- **Redondeo dirigido**: siempre a favor del protocolo, nunca del usuario

### Lecturas
- [Uniswap v2 Whitepaper](https://docs.uniswap.org/whitepaper.pdf), secciones 2 y 3
- [Constant Function Market Makers](https://arxiv.org/abs/2003.10001) (Angeris & Chitra), introducción
- [Raydium CP-Swap (código)](https://github.com/raydium-io/raydium-cp-swap)
