import { store } from './core/store.js';
import { currentRoute, onRouteChange } from './core/router.js';
import { loadProjectIndex } from './shared/items.js';
import { Sidebar } from './features/sidebar/sidebar.js';
import { Home } from './features/home/home.js';
import { Project } from './features/project/project.js';

const sidebarEl = document.getElementById('sidebar');
const mainEl = document.getElementById('main');

let index = new Map();

function renderSidebar() {
  Sidebar(sidebarEl, { index, route: currentRoute() });
}

async function renderMain() {
  const route = currentRoute();
  const scroll = window.scrollY;
  if (route.name === 'project') await Project(mainEl, { dir: route.dir, index });
  else await Home(mainEl, { index });
  return scroll;
}

async function render({ keepScroll = false } = {}) {
  renderSidebar();
  const scroll = await renderMain();
  window.scrollTo(0, keepScroll ? scroll : 0);
}

async function boot() {
  if (location.protocol === 'file:') {
    mainEl.innerHTML = `
      <div class="card">
        <h2>Abre la web con un servidor local</h2>
        <p>El navegador no deja leer los README desde <code>file://</code>. En la raíz del repo ejecuta:</p>
        <pre><code>python3 -m http.server 4321</code></pre>
        <p>y abre <a href="http://localhost:4321">http://localhost:4321</a>.</p>
      </div>`;
    return;
  }
  index = await loadProjectIndex();
  await render();
  onRouteChange(() => render());
  // Cualquier cambio en el progreso re-pinta manteniendo la posición del scroll.
  store.subscribe(() => render({ keepScroll: true }));
}

boot().catch((err) => {
  console.error(err);
  mainEl.innerHTML = `<p class="error">Error cargando el lab: ${err.message}</p>`;
});
