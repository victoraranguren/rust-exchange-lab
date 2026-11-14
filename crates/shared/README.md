# shared: lo que usan 2+ crates

## Regla (Scope Rule)
Aquí **solo** entra lo que hoy usan dos o más crates. Nada nace aquí "por si acaso": empieza en su crate y **se promueve** cuando aparece un segundo consumidor.

## Candidatos típicos (aparecerán a medida que avances)
- Newtypes de dominio: `Amount`, `Asset`, `UserId`, `WalletAddress` (pubkey validada)
- `AppError` base + su `IntoResponse`
- La configuración y el pool de DB compartidos (o el trait que los abstrae)
- El cliente JSON-RPC de Solana, si lo usan el indexer, deposits y withdrawals

## Antipatrones
- Un `utils.rs` gigante
- Lógica de negocio de un solo crate escondida aquí
- Que `shared` dependa de un crate de dominio (la dependencia siempre va **hacia** `shared`, nunca desde él)
