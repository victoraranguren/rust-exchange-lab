# 04 · cex-withdrawals

## Qué construyes
El **servicio de retiros de TuyCEX**: el usuario pide retirar a su wallet, el sistema valida límites, bloquea fondos, firma desde la hot wallet, envía y confirma.

## Features
1. **Solicitud de retiro** con validación de dirección, saldo y límites.
2. **Aprobación**: automática bajo un umbral, manual (admin) por encima.
3. **Procesador** que firma con la hot wallet, envía y espera la confirmación.
4. **Seguimiento** del estado y reintentos si la red falla.

## Base de datos
```
withdrawals (id, user_id, asset, amount, fee, to_address, status, signature,
             attempts, last_error, requested_at, approved_by, completed_at)
withdrawal_limits (asset PK, min_amount, daily_limit_per_user, auto_approve_below)
```
Estados: `requested → approved → broadcasting → confirmed`, o bien `→ rejected / failed (fondos devueltos)`.

## API
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/users/{id}/withdrawals` | solicitar retiro `{asset, amount, to_address}` |
| `GET` | `/users/{id}/withdrawals` | historial |
| `GET` | `/admin/withdrawals?status=requested` | cola pendiente de aprobación |
| `POST` | `/admin/withdrawals/{id}/approve` | aprobar |
| `POST` | `/admin/withdrawals/{id}/reject` | rechazar (desbloquea los fondos) |

## Requisitos
- **RF1** Al solicitar: `available → locked` (monto + fee) en el ledger de `cex-core`.
- **RF2** Validar: dirección válida, monto ≥ mínimo, límite diario por usuario.
- **RF3** Bajo `auto_approve_below` se aprueba solo; por encima espera a un admin.
- **RF4** El procesador toma los retiros `approved`, construye la tx (SOL transfer o SPL `transferChecked`), firma con la hot wallet y envía.
- **RF5** Confirmado → se debita lo bloqueado. Rechazado o fallido definitivo → se desbloquea.
- **RF6** Reintentos con backoff ante errores de red (máximo 3); si el blockhash expiró, se reconstruye la tx.
- **RNF1** Un retiro **nunca** se envía dos veces: antes de reintentar, verificar si la firma anterior aterrizó.
- **RNF2** La llave de la hot wallet se lee del entorno o de un archivo, y nunca se loguea.
- **RNF3** Las transiciones de estado inválidas son imposibles de representar en el código.

## Criterios de aceptación
- [ ] Retiro pequeño en devnet: `requested → confirmed` solo y saldo debitado
- [ ] Retiro grande queda en la cola; aprobar → enviado; rechazar → fondos devueltos
- [ ] Simular un timeout después de enviar → no hay doble envío
- [ ] Superar el límite diario → `422`

## Conceptos a estudiar

### Rust / Axum
- **Typestate pattern** (`Withdrawal<Requested>` → `Withdrawal<Approved>`) con `PhantomData`
- Construir y firmar transacciones con los crates de Solana (`solana-transaction`, `solana-keypair`, `spl-token`)
- Manejo de secretos: `secrecy` / `zeroize`, y no implementar `Debug` para las llaves
- Middleware de rol admin (`from_fn` / extractor propio)

### System design
- Efectos externos **exactamente una vez**: deduplicar por firma antes de reintentar
- **Sagas y compensación**: si el retiro falla, se devuelven los fondos
- Colas de aprobación y separación de funciones (quien pide no aprueba)
- Límites con **ventana deslizante** vs ventana fija diaria
- Hot wallet vs cold wallet; expiración del blockhash (~150 slots)

### Matemáticas
- **Backoff exponencial + jitter**: espera `base·2ⁿ`; el total es una serie geométrica `base·(2ⁿ − 1)`. El jitter evita la "manada" de reintentos sincronizados
- **Ventanas deslizantes**: sumas acumuladas en un intervalo `[t − 24h, t]`
- **FSM** de nuevo, ahora con estados de compensación
- **Criptografía, a nivel conceptual**: firmas Ed25519 (curvas elípticas, por qué la pubkey se deriva de la privada y no al revés) y funciones hash
- **Tiempo de expiración**: slots × ~400 ms → segundos reales que tienes para que aterrice la tx

### Lecturas
- *Rust for Rustaceans*, cap. 3 (Designing Interfaces: typestate)
- [AWS: Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- *Real-World Cryptography* (David Wong), cap. 7 (firmas)
