// Code explorer: the project's files with line numbers and highlighting, the script's section outline, and search.
import { route, api, app, esc, list, $ } from './core.js';
import { highlightLines } from './highlight.js';

route('code', async (args, query) => {
  const files = await api('/files');
  const slug = args[0] && files.some(f => f.slug === args[0]) ? args[0] : files[0].slug;
  const f = await api('/file/' + slug);
  const from = +query.line || 0, to = +query.to || from;
  const lines = f.language === 'javascript' ? highlightLines(f.text) : f.text.split('\n').map(esc);
  app().innerHTML = `
  <p class="kicker">Code</p>
  <div class="side">
    <aside class="panel">
      <label for="q">Search the files</label><input id="q" type="search" placeholder="e.g. NBR, gt(, areaHa">
      <div class="hits" id="hits"></div>
      <h3>Files</h3>
      <div class="files">${list(files, x => `<a href="#/code/${x.slug}" class="${x.slug === slug ? 'on' : ''}">${esc(x.name)}
        <small>${x.lines} lines · ${(x.bytes / 1024).toFixed(1)} KB</small></a>`)}</div>
      ${f.outline.length ? `<h3>Outline</h3><div class="outline">${list(f.outline, o =>
        `<a href="#/code/${slug}?line=${o.line}">${o.line} · ${esc(o.text)}</a>`)}</div>` : ''}
    </aside>
    <div>
      <h1 style="font-size:26px">${esc(f.name)}</h1>
      <p class="mute small">${esc(f.summary)} · <a href="${f.github}" target="_blank" rel="noopener">view on GitHub</a></p>
      <div class="src"><table><tbody>${list(lines, (l, i) =>
        `<tr id="L${i + 1}" class="${i + 1 >= from && i + 1 <= to && from ? 'hit' : ''}"><td class="n">${i + 1}</td><td>${l || ' '}</td></tr>`)}</tbody></table></div>
    </div>
  </div>`;
  if (from) setTimeout(() => document.getElementById('L' + from)?.scrollIntoView({ block: 'center', inline: 'nearest' }), 0);

  let timer = 0;
  $('#q').addEventListener('input', e => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const q = e.target.value.trim().toLowerCase();
      if (q.length < 2) { $('#hits').innerHTML = ''; return; }
      const all = await Promise.all(files.map(x => api('/file/' + x.slug)));
      const hits = [];
      for (const x of all) {
        if (x.name.toLowerCase().includes(q)) hits.push(`<a href="#/code/${x.slug}"><b>${esc(x.name)}</b></a>`);
        x.text.split('\n').forEach((l, i) => {
          if (l.toLowerCase().includes(q) && hits.length < 60) {
            hits.push(`<a href="#/code/${x.slug}?line=${i + 1}"><b>${esc(x.name.split(' ').pop())}:${i + 1}</b> ${esc(l.trim().slice(0, 60))}</a>`);
          }
        });
      }
      $('#hits').innerHTML = hits.length ? hits.join('') : '<p class="small mute">No matches.</p>';
    }, 200);
  });
});
