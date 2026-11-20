import { PROJECTS, findProject } from '../../core/projects.js';
import { store } from '../../core/store.js';
import { loadText, renderMarkdown, renderDiagrams } from '../../core/markdown.js';
import { progressOf } from '../../shared/items.js';
import { progressBar, statusBadge, escapeHtml, timeAgo } from '../../shared/ui.js';

/** El proyecto en el que toca trabajar: el primero en progreso, o el primero sin terminar. */
function nextProject() {
  return (
    PROJECTS.find((p) => store.project(p.dir).status === 'in_progress') ??
    PROJECTS.find((p) => store.project(p.dir).status !== 'done')
  );
}

/** Siguiente ítem pendiente del proyecto, respetando el orden del README (método primero). */
function nextItem(items) {
  const ordered = [
    ...items.filter((i) => i.group === 'method').slice(0, 2),
    ...items.filter((i) => i.group === 'study'),
    ...items.filter((i) => i.group === 'method').slice(2, 3),
    ...items.filter((i) => i.group === 'build'),
    ...items.filter((i) => i.group === 'method').slice(3),
  ];
  return ordered.find((i) => !store.isChecked(i.key));
}

export async function Home(el, { index }) {
  const next = nextProject();
  const nextItems = next ? index.get(next.dir) ?? [] : [];
  const pending = next && nextItem(nextItems);
  const log = store.log().slice(0, 8);
  const all = progressOf([...index.values()].flat());
  const doneCount = PROJECTS.filter((p) => store.project(p.dir).status === 'done').length;

  el.innerHTML = `
    <header class="hero">
      <p class="eyebrow">Rust + Axum · TuyCEX sobre Solana</p>
      <h1>Tu laboratorio de backend</h1>
      <div class="stats">
        <div class="stat"><span class="stat__value">${all.pct}%</span><span class="stat__label">progreso total</span></div>
        <div class="stat"><span class="stat__value">${doneCount}/${PROJECTS.length}</span><span class="stat__label">proyectos terminados</span></div>
        <div class="stat"><span class="stat__value">${all.groups.study.done}</span><span class="stat__label">conceptos estudiados</span></div>
      </div>
    </header>

    ${next ? `
    <section class="card card--next">
      <p class="eyebrow">Siguiente paso</p>
      <h2><a href="#/p/${next.dir}">${next.num} · ${next.title}</a></h2>
      <p class="muted">${next.summary}</p>
      ${pending ? `<p class="next-item"><span class="tag">${escapeHtml(pending.section)}</span> ${escapeHtml(pending.text)}</p>` : '<p>Todo marcado. ¡Cámbialo a <b>Terminado</b>! 🎉</p>'}
      <a class="btn" href="#/p/${next.dir}">Continuar →</a>
    </section>` : `<section class="card card--next"><h2>🎉 ¡Terminaste los 6 proyectos!</h2><p>Ahora toca volver al 01 y refactorizarlo con todo lo que sabes.</p></section>`}

    <section>
      <h2 class="section-title">Roadmap</h2>
      <div class="grid">
        ${PROJECTS.map((p) => {
          const prog = progressOf(index.get(p.dir) ?? []);
          const state = store.project(p.dir);
          return `
            <a class="card card--project" href="#/p/${p.dir}">
              <div class="card__head"><span class="num">${p.num}</span>${statusBadge(state.status)}</div>
              <h3>${p.title}</h3>
              <p class="muted">${p.summary}</p>
              <div class="card__bars">
                ${progressBar(prog.groups.build.done, prog.groups.build.total, { label: 'Construcción', size: 'sm' })}
                ${progressBar(prog.groups.study.done, prog.groups.study.total, { label: 'Estudio', size: 'sm' })}
              </div>
              <p class="muted small">⏱ ${p.weeks}</p>
            </a>`;
        }).join('')}
      </div>
    </section>

    ${log.length ? `
    <section>
      <h2 class="section-title">Actividad reciente</h2>
      <ul class="activity">
        ${log.map((entry) => `
          <li>
            <span class="tag">${findProject(entry.projectDir)?.num ?? '··'}</span>
            <span class="activity__text">${escapeHtml(entry.label)}</span>
            <span class="muted small">${timeAgo(entry.at)}</span>
          </li>`).join('')}
      </ul>
    </section>` : ''}

    <details class="guide">
      <summary>📖 Guía del lab (README raíz)</summary>
      <div data-slot="readme"><p class="muted">Cargando…</p></div>
    </details>`;

  const slot = el.querySelector('[data-slot="readme"]');
  try {
    const md = renderMarkdown(await loadText('README.md'));
    slot.replaceChildren(md);
    el.querySelector('.guide').addEventListener('toggle', () => renderDiagrams(slot), { once: true });
  } catch (err) {
    slot.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  }
}
