# 01 · cex-core

## Qué construyes
El **server + DB básica de TuyCEX**: usuarios, cuentas por asset y un **ledger de doble entrada** que es la única fuente de verdad del dinero.

## Features
1. **Usuarios**: registro y consulta.
2. **Cuentas por asset** (SOL, USDC) con saldo `available` y `locked`.
3. **Ledger de doble entrada**: todo movimiento genera asientos que suman cero.
4. **Operaciones de admin**: acreditar, debitar y transferir entre usuarios, con su auditoría.

## Base de datos
```
users          (id, email UNIQUE, name, status, created_at)
assets         (symbol PK, decimals)                         -- SOL 9, USDC 6
accounts       (id, user_id, asset, available, locked)       UNIQUE (user_id, asset)
journal        (id, kind, reference UNIQUE, created_by, created_at)   -- una operación
journal_lines  (id, journal_id, account_id, amount)          -- amount con signo, Σ = 0 por journal
```
> Cuenta especial del sistema (`user_id = 0`) para la contrapartida de depósitos y retiros.

## API
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/users` | crear usuario (se crean sus cuentas SOL y USDC) |
| `GET` | `/users/{id}` | datos del usuario |
| `GET` | `/users/{id}/balances` | balances por asset |
| `GET` | `/users/{id}/movements?limit=&before=` | movimientos (paginación por cursor) |
| `POST` | `/admin/credit` | acreditar `{user_id, asset, amount, reference}` |
| `POST` | `/admin/debit` | debitar |
| `POST` | `/transfers` | transferencia interna entre usuarios |

## Requisitos
- **RF1** Cada operación es un `journal` cuyas líneas suman **exactamente 0**.
- **RF2** `reference` única: repetir la misma operación no la aplica dos veces (idempotencia).
- **RF3** Debitar o transferir sin fondos → `422`, sin efectos parciales.
- **RF4** El balance de `accounts` siempre es igual a la suma de sus `journal_lines`.
- **RF5** Errores JSON uniformes: `{ "error": "insufficient_funds", "message": "..." }`.
- **RNF1** Toda operación en una única transacción SQL.
- **RNF2** Dos transferencias concurrentes desde la misma cuenta no pueden dejarla negativa.
- **RNF3** Montos en enteros (`BIGINT` / `u64`), nunca `f64`.

## Criterios de aceptación
- [ ] Endpoint o test de **reconciliación**: `Σ journal_lines` por cuenta = balance, y `Σ total` del sistema = 0
- [ ] Test: misma `reference` dos veces → un solo asiento
- [ ] Test de concurrencia: 50 transferencias en paralelo no rompen la RNF2
- [ ] Tests de integración por endpoint (camino feliz + error)

## Conceptos a estudiar

### Rust / Axum
- `AppError` + `impl IntoResponse`, y mapear errores de dominio a HTTP
- Extractors propios con `FromRequestParts` (paginación, auth básica)
- `sqlx::Transaction` y cómo pasarla entre funciones (lifetimes, `&mut *tx`)
- Traits para repositorios; `Send + Sync + 'static` en el `State`
- Tests de integración con `#[sqlx::test]` y `tower::ServiceExt::oneshot`

### System design
- **Contabilidad de doble entrada**: journal, líneas y cuentas de sistema
- ACID y **niveles de aislamiento** (Read Committed vs Repeatable Read vs Serializable)
- Locking pesimista (`SELECT … FOR UPDATE`) vs optimista (columna `version`)
- Idempotency keys, paginación por cursor vs offset
- Reconciliación: cómo un exchange detecta que "falta dinero"

### Matemáticas
- **Invariantes de conservación**: `∀ journal: Σ líneas = 0` y `Σ balances del sistema = 0`
- **Lógica de predicados**: escribir las reglas como `∀` / `∃` y convertirlas en property tests
- **Aritmética entera**: overflow, complemento a dos, rango de `BIGINT` (`i64`) vs `u64`
- **Álgebra relacional**: joins, agregaciones `SUM … GROUP BY` y por qué el resultado de la reconciliación es determinista
- **Concurrencia**: interleavings y condiciones de carrera (el clásico "lost update")

### Lecturas
- *Designing Data-Intensive Applications*, cap. 7 (Transactions)
- [Martin Fowler: Accounting Patterns](https://martinfowler.com/eaaDev/AccountingNarrative.html)
- Documentación de PostgreSQL: *Transaction Isolation*
