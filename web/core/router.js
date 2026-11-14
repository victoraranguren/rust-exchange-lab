// Router por hash: `#/` (inicio) y `#/p/<dir>` (proyecto).
export function currentRoute() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const project = hash.match(/^\/p\/([^/]+)/);
  return project ? { name: 'project', dir: decodeURIComponent(project[1]) } : { name: 'home' };
}

export function onRouteChange(fn) {
  window.addEventListener('hashchange', () => fn(currentRoute()));
}
