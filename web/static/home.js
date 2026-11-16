// Home page: hero, counts from /api/info (parsed from the repo), cards to the pages, how the site is built.
import { route, api, app, esc } from './core.js';

route('home', async () => {
  const [info, m] = await Promise.all([api('/info'), api('/method')]);
  const years = m.periods.map(p => p.start.slice(0, 4));
  app().innerHTML = `
  <section class="hero">
    <p class="kicker">Google Earth Engine · Sentinel-2 · NBR / dNBR</p>
    <h1 class="glow">Sentinel-2 Burn Area Analysis</h1>
    <p class="lead">A Google Earth Engine script for detecting and analyzing burn areas using multi-temporal Sentinel-2
    imagery and the Normalized Burn Ratio (NBR). It differences NBR between ${esc(m.change.pre)} and ${esc(m.change.post)},
    thresholds the change into burn-severity zones, and turns the burn scar and its hotspots into polygons with areas in
    hectares.</p>
    <a class="btn" href="#/method">How it works</a><a class="btn alt" href="#/demo">Try the maths</a><a class="btn alt" href="#/code">Read the code</a>
  </section>
  <div class="tiles">
    <div class="tile"><b>${info.script_lines}</b><span>lines of Earth Engine JavaScript</span></div>
    <div class="tile"><b>${info.years}</b><span>August image sets (${esc(years.join(', '))})</span></div>
    <div class="tile"><b>${info.bands}</b><span>Sentinel-2 bands selected; 2 used for NBR (${esc(m.nbr.nir)}, ${esc(m.nbr.swir2)})</span></div>
    <div class="tile"><b>${info.thresholds}</b><span>dNBR thresholds: ${esc(m.zones.gt.join(' / '))}</span></div>
    <div class="tile"><b>${info.vertices}</b><span>vertices in the study-area polygon</span></div>
  </div>
  <div class="eq">NBR = (${esc(m.nbr.nir)} − ${esc(m.nbr.swir2)}) / (${esc(m.nbr.nir)} + ${esc(m.nbr.swir2)})
    &nbsp;·&nbsp; dNBR = NBR<sub>${m.change.pre}</sub> − NBR<sub>${m.change.post}</sub></div>
  <div class="grid" style="margin-top:18px">
    <a class="card" href="#/method"><b>How it works</b><small>from the code, line by line</small><span>Image selection, NBR, dNBR, thresholds, vectors and areas, each with the line it comes from.</span></a>
    <a class="card" href="#/demo"><b>Demo</b><small>the script's maths on a synthetic grid</small><span>Move the thresholds and watch zones, burn polygons and hotspots change. Invented numbers, not satellite data.</span></a>
    <a class="card" href="#/code"><b>Code</b><small>${info.files} files</small><span>The script with line numbers, an outline of its sections, and search.</span></a>
    <a class="card" href="#/about"><b>About</b><small>run it in Earth Engine</small><span>What you need, how to open the script in the Code Editor, credits and licence.</span></a>
  </div>
  <h2>How this site works</h2>
  <div class="flow">
    <div>The script needs Google Earth Engine, so it cannot run here. Every fact on these pages (dates, bands, thresholds,
      area filters, polygon) is parsed from <code>${esc(m.script)}</code> by <code>web/gee_script.py</code>.</div>
    <div>The demo runs the script's raster arithmetic (NBR, dNBR, <code>gt</code> thresholds, 4-connected regions, hectares),
      ported to <code>burn_engine.js</code> and checked by a node test against hand-worked values.</div>
    <div>Its input is a <span class="synth">synthetic</span> grid of invented reflectances, clearly labelled: no satellite
      imagery or results are shown or implied.</div>
  </div>`;
});
