// Catálogo de proyectos del lab. El contenido real vive en cada README.
export const PROJECTS = [
  { dir: 'cex-core', num: '01', title: 'CEX core', summary: 'Usuarios, cuentas y ledger de doble entrada de TuyCEX', weeks: '2 sem' },
  { dir: 'cex-deposits', num: '02', title: 'CEX deposits', summary: 'Direcciones de depósito, watcher y acreditación', weeks: '2 sem' },
  { dir: 'cex-withdrawals', num: '03', title: 'CEX withdrawals', summary: 'Retiros con límites, aprobación, firma y envío', weeks: '1–2 sem' },
  { dir: 'cex-spot-trading', num: '04', title: 'CEX spot trading', summary: 'Órdenes, matching engine y liquidación', weeks: '2 sem' },
  { dir: 'cex-market-data', num: '05', title: 'CEX market data (por definir)', summary: 'Alcance por definir — ticker, velas y orderbook', weeks: '1 sem' },
  { dir: 'dex-price-indexer', num: '06', title: 'DEX price indexer', summary: 'Precios on-chain desde pools AMM + quotes', weeks: '1–2 sem' },
];

export const findProject = (dir) => PROJECTS.find((p) => p.dir === dir);

export const readmePath = (project) => `crates/${project.dir}/README.md`;
