import { store } from '../../core/store.js';

/** Exportar / importar / borrar el progreso (localStorage puede perderse). */
export function BackupControls(el) {
  el.innerHTML = `
    <div class="backup">
      <button class="btn btn--ghost" data-action="export" title="Descargar backup JSON">⬇ Exportar</button>
      <label class="btn btn--ghost" title="Restaurar desde un backup JSON">⬆ Importar<input type="file" accept="application/json" hidden></label>
      <button class="btn btn--ghost btn--danger" data-action="reset" title="Borrar todo el progreso">Reset</button>
    </div>`;

  el.querySelector('[data-action="export"]').addEventListener('click', () => {
    const blob = new Blob([store.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rust-exchange-lab-progreso-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  el.querySelector('input[type="file"]').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      store.importJson(await file.text());
    } catch (err) {
      alert(`No se pudo importar: ${err.message}`);
    }
  });

  el.querySelector('[data-action="reset"]').addEventListener('click', () => {
    if (confirm('¿Borrar TODO el progreso? Exporta un backup antes si lo quieres conservar.')) store.reset();
  });
}
