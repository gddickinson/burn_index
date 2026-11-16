// How it works: the method of `Sentinel 2 Burn Index.js`, written from the code. Every number comes from /api/method
// (parsed from the script) and every step links to the lines it describes.
import { route, api, app, esc, list } from './core.js';

const SLUG = 'Sentinel-2-Burn-Index.js';
const L = (a, b) => `<a class="cite" href="#/code/${SLUG}?line=${a}${b ? '&to=' + b : ''}">line${b ? 's' : ''} ${a}${b ? '–' + b : ''}</a>`;
const fmt = x => Number(x).toLocaleString('en');

function diagram(m) {
  const box = (x, y, t, s, hl) => `<rect x="${x}" y="${y}" width="170" height="58" rx="6" class="${hl ? 'hl' : ''}"/>
    <text x="${x + 85}" y="${y + 24}" text-anchor="middle">${t}</text><text class="sub" x="${x + 85}" y="${y + 43}" text-anchor="middle">${s}</text>`;
  const p = m.periods.map(q => q.start.slice(0, 4));
  return `<svg class="diagram" viewBox="0 0 780 200" role="img" aria-label="Data flow of the script: Sentinel-2 images per year, clipped and mosaicked, NBR per year, dNBR, thresholds, vectors and areas">
  <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#ff8a2a"/></marker></defs>
  ${box(5, 10, esc(m.collection.id), `Aug ${p[0]}–${p[p.length - 1]}, cloud&lt;${m.cloud_lt.join('/')}%`)}
  ${box(205, 10, 'clip + mosaic', `${m.bands.list.length} bands, study area`)}
  ${box(405, 10, 'NBR per year', `(${m.nbr.nir} − ${m.nbr.swir2}) / (+)`)}
  ${box(605, 10, 'dNBR', `NBR ${m.change.pre} − NBR ${m.change.post}`, true)}
  ${box(605, 130, 'thresholds', `&gt; ${m.zones.gt.join(' / ')}`, true)}
  ${box(405, 130, 'reduceToVectors', `${m.vector.scale_m.join('/')} m, 4-connected`)}
  ${box(205, 130, 'area (ha), filter', `&gt; ${fmt(m.area_filters[0].min_ha)} / &gt; ${fmt(m.area_filters[1].min_ha)} ha`)}
  ${box(5, 130, 'print + map layers', 'exports commented out')}
  <path d="M175,39 H203"/><path d="M375,39 H403"/><path d="M575,39 H603"/><path d="M690,68 V128"/>
  <path d="M605,159 H577"/><path d="M405,159 H377"/><path d="M205,159 H177"/></svg>`;
}

route('method', async () => {
  const m = await api('/method');
  const b = m.polygon.bbox, per = m.periods, [t1, t2, t3] = m.zones.gt;
  const [mainF, hotF] = m.area_filters;
  app().innerHTML = `
  <p class="kicker">How it works</p>
  <h1>From two Augusts to a burn scar</h1>
  <p class="lead">The script compares the Normalized Burn Ratio of the same area in August ${m.change.pre} and August
  ${m.change.post}. Where NBR dropped, vegetation was lost; the size of the drop (dNBR) is thresholded into severity zones,
  and connected burned pixels become polygons whose areas are reported in hectares.</p>
  ${diagram(m)}
  <ol class="steps">
    <li><b>Study area</b> ${L(...m.polygon.lines)}. A hand-drawn polygon of ${m.polygon.vertices.length} vertices spanning
      ${b.south.toFixed(3)}° to ${b.north.toFixed(3)}° N and ${(-b.east).toFixed(3)}° to ${(-b.west).toFixed(3)}° W
      (Idaho, USA). Every image is filtered to it and clipped to it.</li>
    <li><b>Images</b> ${L(m.collection.line)}, ${L(per[0].line, per[per.length - 1].line + 2)}. The Earth Engine collection
      <code>${esc(m.collection.id)}</code> (Sentinel-2 top-of-atmosphere reflectance scaled by 10000, as the comment on
      ${L(84)} says), filtered to ${list(per, q => `${q.start} to ${q.end}`, ', ')} (Earth Engine's <code>filterDate</code>
      excludes the end date) and to scenes whose <code>CLOUD_COVERAGE_ASSESSMENT</code> is below ${m.cloud_lt.join('/')}%.
      Cloud is filtered per scene only; there is no per-pixel cloud mask.</li>
    <li><b>Bands, clip and mosaic</b> ${L(m.bands.line, m.bands.line + 2)}, ${L(73, 78)}. Nine bands are kept
      (${esc(m.bands.list.join(', '))}); each image is clipped to the polygon and each year's images are mosaicked into
      one image (where scenes overlap, the mosaic shows the last one in the collection). Only ${m.nbr.nir} and
      ${m.nbr.swir2} enter the calculation; B4/B3/B2 are used for the true-colour layer ${L(102)}.</li>
    <li><b>NBR per year</b> ${L(m.nbr.nir_line, 119)}. <span class="eq">NBR = (${m.nbr.nir} − ${m.nbr.swir2}) /
      (${m.nbr.nir} + ${m.nbr.swir2})</span>: ${m.nbr.nir} is near-infrared (842 nm, 10 m) and ${m.nbr.swir2}
      short-wave infrared 2 (2190 nm, 20 m), per the band table at ${L(84, 98)}. Healthy vegetation reflects strongly in
      NIR and weakly in SWIR 2 (high NBR); burned ground the reverse. NBR is computed for ${m.nbr.years.join(', ')}, but
      ${m.nbr.years.filter(y => y !== m.change.pre && y !== m.change.post).join(', ') || 'no other year'} is not used further.</li>
    <li><b>dNBR</b> ${L(m.change.line)}. <span class="eq">change_nbr = NBR<sub>${m.change.pre}</sub> −
      NBR<sub>${m.change.post}</sub></span>: positive where NBR fell between the two Augusts.</li>
    <li><b>Thresholds</b> ${L(m.main_burn.line, m.hotspots.line + 1)}. Main burn: dNBR &gt; ${m.main_burn.gt}. Zones:
      the sum of three tests, dNBR &gt; ${t1}, &gt; ${t2}, &gt; ${t3}, so zone 1 is ${t1} &lt; dNBR ≤ ${t2}, zone 2 is
      ${t2} &lt; dNBR ≤ ${t3} and zone 3 is dNBR &gt; ${t3} (zone 0 is masked). Hotspots: dNBR &gt; ${m.hotspots.gt}.
      The zones layer is drawn blue, green, red for 1, 2, 3 ${L(176)}.</li>
    <li><b>Polygons</b> ${L(153, 171)}. <code>reduceToVectors</code> turns connected burned pixels (main burn) and
      connected hotspot pixels into polygons at ${m.vector.scale_m.join('/')} m (the comment notes that higher resolution
      needs an export), with <code>eightConnected: ${m.vector.eight_connected.join('/')}</code> (pixels touching only at a
      corner stay apart) and each polygon's mean dNBR.</li>
    <li><b>Areas and filters</b> ${L(m.error_margin.line, mainF.line + 1)}. Each polygon's geodesic area (error margin
      ${m.error_margin.m} m) is divided by 100 × 100 to give hectares. Main-burn polygons are kept above
      ${fmt(mainF.min_ha)} ha, hotspot polygons above ${fmt(hotF.min_ha)} ha.</li>
    <li><b>Outputs</b> ${L(m.prints[0].line, 201)}. The console prints "${esc(m.prints[0].label.trim())}" as the area of the
      <em>first</em> main-burn polygon left by the filter, and "${esc(m.prints[1].label.trim())}" as the sum over hotspot
      polygons; the map shows the polygon outlines. Raster and shapefile exports to Google Drive are present but commented
      out ${L(129, 139)}, ${L(203, 211)}.</li>
  </ol>
  <h2>Thresholds: script and README</h2>
  <p>The README's severity table lists the widely used dNBR classes 0.1 / 0.27 / 0.66 (low, moderate, high). The script
  itself uses ${t1} / ${t2} / ${t3} for its three zones and ${m.hotspots.gt} for hotspots ${L(m.zones.line)}, so its zone 1
  spans the README's low and moderate classes. The <a href="#/demo">demo</a> lets you try either set.</p>
  <h2>Things to know when reading the results</h2>
  <ul class="steps">
    <li>The total burn size printed at ${L(m.prints[0].line)} is the area of the first polygon above
      ${fmt(mainF.min_ha)} ha; if more than one polygon passed the filter, the others are not added in.</li>
    <li>Polygon areas come from 30 m vectors of the 10 m / 20 m bands, so they are approximate (as the comment on
      ${L(156)} notes).</li>
    <li>Year-to-year differences that are not fire (harvest, drought, phenology) also change NBR; only the thresholds
      separate them.</li>
  </ul>`;
});
