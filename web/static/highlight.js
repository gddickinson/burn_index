// Tiny dependency-free highlighter for Earth Engine JavaScript: comments, strings, numbers, keywords and ee.* names.
// Works line by line (block comments carry over between lines). Returns HTML-escaped markup.
import { esc } from './core.js';

const KW = new Set(['var', 'function', 'return', 'new', 'if', 'else', 'for', 'true', 'false', 'null']);
const TOKEN = /(\/\/.*$)|(\/\*)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?(?:E\d+)?\b)|(\bee\.\w+(?:\.\w+)*|\b(?:Map|Export|print)\b)|(\b[A-Za-z_]\w*\b)/g;

export function highlightLines(text) {
  let inBlock = false;
  return text.split('\n').map(line => {
    let out = '', i = 0;
    if (inBlock) {
      const end = line.indexOf('*/');
      if (end < 0) return `<span class="tk-c">${esc(line)}</span>`;
      out += `<span class="tk-c">${esc(line.slice(0, end + 2))}</span>`; i = end + 2; inBlock = false;
    }
    const rest = line.slice(i);
    let last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(rest))) {
      out += esc(rest.slice(last, m.index));
      if (m[1]) out += `<span class="tk-c">${esc(m[1])}</span>`;
      else if (m[2]) {
        const end = rest.indexOf('*/', m.index + 2);
        const chunk = end < 0 ? rest.slice(m.index) : rest.slice(m.index, end + 2);
        out += `<span class="tk-c">${esc(chunk)}</span>`;
        if (end < 0) { inBlock = true; last = rest.length; break; }
        TOKEN.lastIndex = end + 2; last = end + 2; continue;
      } else if (m[3]) out += `<span class="tk-s">${esc(m[3])}</span>`;
      else if (m[4]) out += `<span class="tk-n">${esc(m[4])}</span>`;
      else if (m[5]) out += `<span class="tk-ee">${esc(m[5])}</span>`;
      else out += KW.has(m[6]) ? `<span class="tk-k">${m[6]}</span>` : esc(m[6]);
      last = TOKEN.lastIndex;
    }
    return out + esc(rest.slice(last));
  });
}
