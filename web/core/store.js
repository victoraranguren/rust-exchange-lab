// Estado persistido en localStorage. Única fuente de verdad del progreso.
const KEY = 'rust-exchange-lab:v1';

const empty = () => ({ checks: {}, projects: {}, log: [] });

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // modo privado o storage bloqueado: la app sigue funcionando en memoria
  }
  listeners.forEach((fn) => fn(state));
}

const defaultProject = () => ({ status: 'pending', notes: '', startedAt: null, finishedAt: null });

export const store = {
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  isChecked: (key) => Boolean(state.checks[key]),
  checkedAt: (key) => state.checks[key] ?? null,

  toggle(key, { label, projectDir }) {
    if (state.checks[key]) {
      delete state.checks[key];
    } else {
      const at = new Date().toISOString();
      state.checks[key] = at;
      state.log = [{ key, label, projectDir, at }, ...state.log].slice(0, 40);
      const p = this.project(projectDir);
      if (p.status === 'pending') {
        state.projects[projectDir] = { ...p, status: 'in_progress', startedAt: at };
      }
    }
    persist();
  },

  project: (dir) => ({ ...defaultProject(), ...state.projects[dir] }),

  updateProject(dir, patch) {
    const current = this.project(dir);
    const next = { ...current, ...patch };
    if (patch.status === 'in_progress' && !current.startedAt) next.startedAt = new Date().toISOString();
    if (patch.status === 'done') next.finishedAt = new Date().toISOString();
    if (patch.status && patch.status !== 'done') next.finishedAt = null;
    state.projects[dir] = next;
    persist();
  },

  // Guardado silencioso (notas): no re-renderiza la vista.
  saveNotes(dir, notes) {
    state.projects[dir] = { ...this.project(dir), notes };
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  },

  log: () => state.log,

  exportJson: () => JSON.stringify({ app: 'rust-exchange-lab', version: 1, exportedAt: new Date().toISOString(), state }, null, 2),

  importJson(text) {
    const parsed = JSON.parse(text);
    const incoming = parsed.state ?? parsed;
    if (typeof incoming !== 'object' || !incoming.checks) throw new Error('El archivo no parece un backup del lab');
    state = { ...empty(), ...incoming };
    persist();
  },

  reset() {
    state = empty();
    persist();
  },
};
