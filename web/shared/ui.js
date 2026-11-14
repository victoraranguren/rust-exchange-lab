// Piezas de UI usadas por 2+ features.

export const STATUS_LABELS = { pending: 'Sin empezar', in_progress: 'En progreso', done: 'Terminado' };

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function progressBar(done, total, { label = '', size = 'md' } = {}) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `
    <div class="bar bar--${size}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHtml(label)}">
      <div class="bar__fill" style="width:${pct}%"></div>
    </div>
    ${label ? `<div class="bar__label"><span>${escapeHtml(label)}</span><span>${done}/${total} · ${pct}%</span></div>` : ''}`;
}

export function statusBadge(status) {
  return `<span class="badge badge--${status}">${STATUS_LABELS[status] ?? status}</span>`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}
