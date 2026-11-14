import { marked } from 'https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js';
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.esm.min.mjs';

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

marked.use({
  gfm: true,
  renderer: {
    // Los bloques ```mermaid se dibujan como diagramas.
    code(code, lang) {
      const text = typeof code === 'object' ? code.text : code;
      const language = typeof code === 'object' ? code.lang : lang;
      if (language === 'mermaid') return `<pre class="mermaid">${escapeHtml(text)}</pre>`;
      return false; // renderer por defecto
    },
  },
});

export async function loadText(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`No pude leer ${path} (${res.status})`);
  return res.text();
}

/** Renderiza markdown a un elemento suelto (no insertado en el DOM). */
export function renderMarkdown(md) {
  const root = document.createElement('div');
  root.className = 'md';
  root.innerHTML = marked.parse(md);

  root.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    const local = href.match(/^crates\/([^/#]+)\/?$/);
    if (local) {
      a.setAttribute('href', `#/p/${local[1]}`);
    } else if (/^https?:/.test(href)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  });
  return root;
}

const isDark = () => {
  const forced = document.documentElement.dataset.theme;
  if (forced) return forced === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/** Dibuja los diagramas mermaid de un elemento ya insertado en el DOM. */
export async function renderDiagrams(root) {
  const nodes = root.querySelectorAll('pre.mermaid');
  if (!nodes.length) return;
  mermaid.initialize({ startOnLoad: false, theme: isDark() ? 'dark' : 'default', securityLevel: 'strict' });
  try {
    await mermaid.run({ nodes });
  } catch (err) {
    console.warn('mermaid:', err);
  }
}
