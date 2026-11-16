// Entry point: lazy page modules, footer mode text, router.
import { start, lazy, route, app, isStatic, $ } from './core.js';

const PAGES = { 'home.js': ['home'], 'method.js': ['method'], 'demo.js': ['demo'], 'code.js': ['code'], 'about.js': ['about'] };
lazy(Object.fromEntries(Object.entries(PAGES).flatMap(([file, names]) => names.map(n => [n, () => import('./' + file)]))));

route('notfound', () => { app().innerHTML = '<h1>Not found</h1><p><a href="#/">Back to the start</a></p>'; });

$('#mode').textContent = isStatic()
  ? 'static site: the demo runs in your browser on a synthetic grid'
  : 'local app: facts parsed from the script at /api';
start();
