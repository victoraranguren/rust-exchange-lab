import { findProject, readmePath, PROJECTS } from '../../core/projects.js';
import { store } from '../../core/store.js';
import { loadText, renderMarkdown, renderDiagrams } from '../../core/markdown.js';
import { collectItems, methodItems, progressOf } from '../../shared/items.js';
import { progressBar, statusBadge, escapeHtml, formatDate, STATUS_LABELS } from '../../shared/ui.js';

function checkbox(item, projectDir) {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'check';
  input.checked = store.isChecked(item.key);
  input.setAttribute('aria-label', item.text);
  input.addEventListener('change', () => {
    store.toggle(item.key, { label: item.text.slice(0, 120), projectDir });
  });
  return input;
}

export async function Project(el, { dir, index }) {
  const project = findProject(dir);
  if (!project) {
    el.innerHTML = `<p class="error">Proyecto no encontrado: ${escapeHtml(dir)}</p><a href="#/">← Inicio</a>`;
    return;
  }

  let md;
  try {
    md = renderMarkdown(await loadText(readmePath(project)));
  } catch (err) {
    el.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    return;
  }

  const state = store.project(dir);
  const items = index.get(dir) ?? [];
  const prog = progressOf(items);
  const pos = PROJECTS.indexOf(project);
  const prev = PROJECTS[pos - 1];
  const next = PROJECTS[pos + 1];

  el.innerHTML = `
    <header class="project-head">
      <p class="eyebrow">Proyecto ${project.num} · ⏱ ${project.weeks}</p>
      <div class="project-head__row">
        <h1>${project.title}</h1>
        ${statusBadge(state.status)}
      </div>
      <p class="muted"><code>cd crates/${project.dir}</code></p>
      <div class="project-head__controls">
        <label>Estado
          <select data-field="status">
            ${Object.entries(STATUS_LABELS).map(([v, l]) => `<option value="${v}" ${v === state.status ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
        <span class="muted small">Inicio: ${formatDate(state.startedAt)} · Fin: ${formatDate(state.finishedAt)}</span>
      </div>
      <div class="bars3">
        <div>${progressBar(prog.groups.method.done, prog.groups.method.total, { label: 'Método' })}</div>
        <div>${progressBar(prog.groups.study.done, prog.groups.study.total, { label: 'Estudio' })}</div>
        <div>${progressBar(prog.groups.build.done, prog.groups.build.total, { label: 'Construcción' })}</div>
      </div>
    </header>

    <div class="project-body">
      <article data-slot="readme"></article>
      <aside class="project-aside">
        <section class="card">
          <h3>Método</h3>
          <ul class="checklist" data-slot="method"></ul>
        </section>
        <section class="card">
          <h3>Mis notas</h3>
          <textarea data-field="notes" rows="10" placeholder="Dudas, decisiones, errores del compilador que te costaron…">${escapeHtml(state.notes)}</textarea>
          <p class="muted small" data-slot="saved">Se guarda solo en este navegador.</p>
        </section>
      </aside>
    </div>

    <nav class="pager">
      ${prev ? `<a href="#/p/${prev.dir}">← ${prev.num} ${prev.title}</a>` : '<span></span>'}
      ${next ? `<a href="#/p/${next.dir}">${next.num} ${next.title} →</a>` : '<span></span>'}
    </nav>`;

  // README con ítems interactivos
  for (const item of collectItems(dir, md)) {
    item.li.querySelector(':scope > input[type="checkbox"]')?.remove();
    item.li.classList.add('item', `item--${item.group}`);
    if (store.isChecked(item.key)) item.li.classList.add('is-done');
    const body = document.createElement('div');
    body.className = 'item__body';
    body.append(...item.li.childNodes);
    item.li.append(checkbox(item, dir), body);
  }
  el.querySelector('[data-slot="readme"]').replaceChildren(md);
  renderDiagrams(md);

  // Método
  const methodList = el.querySelector('[data-slot="method"]');
  for (const item of methodItems(dir)) {
    const li = document.createElement('li');
    li.className = `item ${store.isChecked(item.key) ? 'is-done' : ''}`;
    const label = document.createElement('div');
    label.className = 'item__body';
    label.textContent = item.text;
    li.append(checkbox(item, dir), label);
    methodList.append(li);
  }

  el.querySelector('[data-field="status"]').addEventListener('change', (e) => {
    store.updateProject(dir, { status: e.target.value });
  });

  let timer;
  const saved = el.querySelector('[data-slot="saved"]');
  el.querySelector('[data-field="notes"]').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      store.saveNotes(dir, e.target.value);
      saved.textContent = `Guardado ${new Date().toLocaleTimeString('es')}`;
    }, 400);
  });
}
