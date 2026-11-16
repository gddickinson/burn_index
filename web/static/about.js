// About: what the project is, how to run the script in the Earth Engine Code Editor, how to run this site, credits.
import { route, api, app, esc, $, download } from './core.js';

route('about', async () => {
  const [m, f] = await Promise.all([api('/method'), api('/file/Sentinel-2-Burn-Index.js')]);
  app().innerHTML = `
  <p class="kicker">About</p>
  <h1>Sentinel-2 Burn Area Analysis</h1>
  <p class="lead">A Google Earth Engine script for detecting and analyzing burn areas using multi-temporal Sentinel-2
  imagery and the Normalized Burn Ratio (NBR): it identifies burn scars, classifies burn severity, and exports vector
  polygons of the affected areas.</p>

  <h2>Run it in the Earth Engine Code Editor</h2>
  <p>You need a Google Earth Engine account (README, "Requirements").</p>
  <ol class="steps">
    <li>Open the <a href="https://code.earthengine.google.com/" target="_blank" rel="noopener">Earth Engine Code Editor</a>
      and start a new script.</li>
    <li>Paste <code>${esc(m.script)}</code> into it: <button id="copy">Copy the script</button><button class="alt" id="dl">Download it</button>
      <span class="small mute" id="copied"></span><br>The first statement declares the study-area polygon and the
      <code>${esc(m.collection.id)}</code> collection, the way the Code Editor writes its imports.</li>
    <li>Adjust the study area geometry to your area of interest and the <code>filterDate</code> ranges
      (lines ${m.periods.map(p => p.line).join(', ')}) to pre-fire and post-fire dates; dNBR is
      <code>nbr_${m.change.pre} − nbr_${m.change.post}</code> (line ${m.change.line}).</li>
    <li>Run. The map shows the true-colour mosaic, the NBR change, the zones and the polygon outlines; the console prints
      the burn and hotspot areas.</li>
    <li>To save results, uncomment the export blocks (lines 129–139 and 203–211) and start the tasks from the Tasks tab.</li>
  </ol>
  <div class="callout a">If Earth Engine reports that <code>${esc(m.collection.id)}</code> is deprecated or unavailable, its
  catalog entry names the replacement (the harmonized Sentinel-2 Level-1C collection); the script's band names stay the
  same.</div>

  <h2>Run this site locally</h2>
  <pre>pip install -r requirements-web.txt
python run_web.py                    # http://127.0.0.1:8252
python scripts/build_static.py       # the static site, as GitHub Pages serves it
python -m pytest -q tests            # web tests, including the node test of burn_engine.js</pre>

  <h2>Credits and licence</h2>
  <ul>
    <li>European Space Agency for Sentinel-2 data</li>
    <li>Google Earth Engine team for the platform</li>
    <li>The remote sensing community for developing burn indices methodology</li>
  </ul>
  <p>MIT licence. Source: <a href="https://github.com/gddickinson/burn_index" target="_blank" rel="noopener">github.com/gddickinson/burn_index</a>.</p>`;
  $('#copy').onclick = async () => {
    try { await navigator.clipboard.writeText(f.text); $('#copied').textContent = 'Copied.'; }
    catch { $('#copied').textContent = 'Copy is blocked here: use Download.'; }
  };
  $('#dl').onclick = () => download(m.script, f.text, 'text/javascript');
});
