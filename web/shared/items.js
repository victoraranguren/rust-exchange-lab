// Ítems "checkeables" de cada proyecto, derivados de su README.
// Usado por home, sidebar y project → vive en shared/ (Scope Rule).
import { PROJECTS, readmePath } from '../core/projects.js';
import { loadText, renderMarkdown } from '../core/markdown.js';
import { store } from '../core/store.js';

/** Sección (h2) del README → grupo de progreso. */
const SECTION_GROUPS = {
  'Features': 'build',
  'Requisitos': 'build',
  'Criterios de aceptación': 'build',
  'Conceptos a estudiar': 'study',
};

export const GROUP_LABELS = { build: 'Construcción', study: 'Estudio', method: 'Método' };

export const METHOD_STEPS = [
  'Leí el README completo (caso de uso, requisitos y criterios)',
  'Diseñé en 10 líneas mis tipos, módulos y flujo',
  'Escribí tests a partir de los criterios de aceptación',
  'Implementé con commits pequeños',
  'Clippy pedantic limpio y cero unwrap() fuera de tests',
  'Escribí APRENDIZAJES.md',
  'Hice un refactor de regreso a un proyecto anterior',
];

// FNV-1a: clave estable por texto; si editas un ítem del README, solo ese se resetea.
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

const clean = (s) => s.replace(/\s+/g, ' ').trim();

/**
 * Recorre el markdown renderizado y devuelve los <li> de las secciones con progreso.
 * Solo lee el DOM; quien llama decide si los vuelve interactivos.
 */
export function collectItems(projectDir, root) {
  let h2 = '';
  let h3 = '';
  const items = [];
  for (const node of root.children) {
    if (node.tagName === 'H2') { h2 = clean(node.textContent); h3 = ''; continue; }
    if (node.tagName === 'H3') { h3 = clean(node.textContent); continue; }
    if (node.tagName !== 'UL' && node.tagName !== 'OL') continue;
    const group = SECTION_GROUPS[h2];
    if (!group) continue;
    for (const li of node.children) {
      const text = clean(li.textContent);
      items.push({ key: `${projectDir}|${h2}|${h3}|${hash(text)}`, group, section: h3 || h2, text, li });
    }
  }
  return items;
}

export const methodItems = (projectDir) =>
  METHOD_STEPS.map((text, i) => ({ key: `${projectDir}|método|${i}`, group: 'method', section: 'Método', text }));

/** Índice de ítems de todos los proyectos: Map<dir, items[]> (sin referencias al DOM). */
let indexPromise = null;
export function loadProjectIndex() {
  indexPromise ??= Promise.all(
    PROJECTS.map(async (p) => {
      try {
        const root = renderMarkdown(await loadText(readmePath(p)));
        const items = collectItems(p.dir, root).map(({ li, ...rest }) => rest);
        return [p.dir, [...items, ...methodItems(p.dir)]];
      } catch (err) {
        console.warn(err);
        return [p.dir, methodItems(p.dir)];
      }
    }),
  ).then((entries) => new Map(entries));
  return indexPromise;
}

/** Progreso por grupo + total. */
export function progressOf(items) {
  const groups = { build: { done: 0, total: 0 }, study: { done: 0, total: 0 }, method: { done: 0, total: 0 } };
  for (const item of items) {
    const g = groups[item.group];
    g.total += 1;
    if (store.isChecked(item.key)) g.done += 1;
  }
  const done = groups.build.done + groups.study.done + groups.method.done;
  const total = groups.build.total + groups.study.total + groups.method.total;
  return { groups, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}
