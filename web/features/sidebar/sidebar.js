import { PROJECTS } from '../../core/projects.js';
import { store } from '../../core/store.js';
import { toggleTheme, currentTheme } from '../../core/theme.js';
import { progressOf } from '../../shared/items.js';
import { progressBar } from '../../shared/ui.js';
import { BackupControls } from '../backup/backup.js';

/** Sidebar: navegación + progreso global + backup. */
export function Sidebar(el, { index, route }) {
  const all = [...index.values()].flat();
  const global = progressOf(all);

  el.innerHTML = `
    <a class="brand" href="#/">🦀 <span>rust-exchange-lab</span></a>
    <div class="sidebar__global">${progressBar(global.done, global.total, { label: 'Progreso total' })}</div>
    <nav class="nav">
      <a class="nav__item ${route.name === 'home' ? 'is-active' : ''}" href="#/">
        <span class="nav__num">⌂</span><span class="nav__title">Inicio</span>
      </a>
      ${PROJECTS.map((p) => {
        const prog = progressOf(index.get(p.dir) ?? []);
        const status = store.project(p.dir).status;
        const active = route.name === 'project' && route.dir === p.dir;
        return `
          <a class="nav__item ${active ? 'is-active' : ''}" href="#/p/${p.dir}">
            <span class="nav__num nav__num--${status}">${status === 'done' ? '✓' : p.num}</span>
            <span class="nav__title">${p.title}</span>
            <span class="nav__pct">${prog.pct}%</span>
          </a>`;
      }).join('')}
    </nav>
    <div class="sidebar__footer">
      <button class="btn btn--ghost" data-action="theme">${currentTheme() === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}</button>
      <div data-slot="backup"></div>
    </div>`;

  el.querySelector('[data-action="theme"]').addEventListener('click', () => {
    toggleTheme();
    location.reload(); // re-dibuja los diagramas mermaid con el tema nuevo
  });
  BackupControls(el.querySelector('[data-slot="backup"]'));
}
