// Demo: the script's NBR / dNBR / threshold / polygon maths (burn_engine.js) on a SYNTHETIC reflectance grid.
import { route, api, app, list, $, slider } from './core.js';
import * as E from './burn_engine.js';
import { makeScene } from './synthetic.js';

const K = 6;                                   // canvas pixels per grid cell
const ZONE_RGB = [null, [0, 0, 255], [0, 255, 0], [255, 0, 0]];   // line 176 palette 0000FF, 00FF00, FF0000
const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
// Line 121: NBR palette red-white-green over -1..1. Line 127: dNBR palette white-red, Earth Engine's default 0..1 range.
const nbrRGB = v => (v < 0 ? lerp([255, 0, 0], [255, 255, 255], Math.max(0, v + 1)) : lerp([255, 255, 255], [0, 128, 0], Math.min(1, v)));
const dRGB = v => lerp([255, 255, 255], [255, 0, 0], Math.max(0, Math.min(1, v)));

function paint(cv, w, h, rgbAt) {
  cv.width = w * K; cv.height = h * K;
  const ctx = cv.getContext('2d');
  for (let i = 0; i < w * h; i++) {
    const c = rgbAt(i);
    ctx.fillStyle = c ? `rgb(${c[0]},${c[1]},${c[2]})` : '#0b0f1c';
    ctx.fillRect((i % w) * K, Math.floor(i / w) * K, K, K);
  }
  return ctx;
}

function outline(ctx, w, h, regs, color, width) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
  for (const r of regs) {
    const set = new Set(r.cells);
    for (const i of r.cells) {
      const x = i % w, y = (i - x) / w, X = x * K, Y = y * K;
      if (y === 0 || !set.has(i - w)) { ctx.moveTo(X, Y); ctx.lineTo(X + K, Y); }
      if (y === h - 1 || !set.has(i + w)) { ctx.moveTo(X, Y + K); ctx.lineTo(X + K, Y + K); }
      if (x === 0 || !set.has(i - 1)) { ctx.moveTo(X, Y); ctx.lineTo(X, Y + K); }
      if (x === w - 1 || !set.has(i + 1)) { ctx.moveTo(X + K, Y); ctx.lineTo(X + K, Y + K); }
    }
  }
  ctx.stroke();
}

route('demo', async () => {
  const m = await api('/method');
  const script = { t1: m.zones.gt[0], t2: m.zones.gt[1], t3: m.zones.gt[2], hot: m.hotspots.gt, main: m.main_burn.gt };
  const st = { ...script, burn: 0.9, seed: 7, mainMin: 5, hotMin: 0.5, eight: false, pick: null };
  app().innerHTML = `
  <p class="kicker">Demo</p>
  <h1>The script's maths on a <span class="synth">synthetic</span> grid</h1>
  <div class="callout">Everything on this page is <b>synthetic</b>: a ${72} × ${48} grid of invented B8 (NIR) and B12
  (SWIR 2) values for a "before" and an "after" year, with an invented burn patch. It is not Sentinel-2 imagery, not the
  study area and not a result. What is real is the arithmetic: NBR (line ${m.nbr.line}), dNBR (line ${m.change.line}),
  the <code>gt</code> thresholds (lines ${m.main_burn.line}–${m.hotspots.line + 1}), 4-connected regions and hectares
  (lines 153–190), ported to <code>burn_engine.js</code>.</div>
  <div class="demo">
    <div>
      <div class="maps">
        <figure><canvas id="cv-pre" aria-label="NBR before (synthetic)"></canvas><figcaption>NBR before (red −1, white 0, green +1)</figcaption></figure>
        <figure><canvas id="cv-post" aria-label="NBR after (synthetic)"></canvas><figcaption>NBR after</figcaption></figure>
        <figure><canvas id="cv-d" aria-label="dNBR (synthetic)"></canvas><figcaption>dNBR = before − after (white 0, red ≥ 1)</figcaption></figure>
        <figure><canvas id="cv-z" aria-label="Zones and polygons (synthetic)"></canvas><figcaption>
          <span class="swatch" style="background:#00f"></span>zone 1 <span class="swatch" style="background:#0f0"></span>zone 2
          <span class="swatch" style="background:#f00"></span>zone 3 · black: main-burn polygons · yellow: hotspot polygons
          (red in the script, line 201)</figcaption></figure>
      </div>
      <p class="small mute">Click a pixel to see its arithmetic.</p>
      <div class="readout panel" id="pix"></div>
    </div>
    <div class="panel" id="ctl">
      <h3>Thresholds</h3>
      <div class="seg" role="group" aria-label="Threshold set"><button data-set="script" class="on">Script</button><button data-set="readme">README table</button></div>
      <div id="sl"></div>
      <label class="chk"><input type="checkbox" id="eight"> eight-connected (the script uses false)</label>
      <h3>Synthetic scene</h3><div id="sl2"></div>
      <button class="alt" id="reseed">New random scene</button>
    </div>
  </div>
  <h2>Summary</h2>
  <div class="readout" id="sum"></div>
  <h2>One pixel by hand</h2>
  <div class="panel"><div class="calc">
    ${list([['b8a', 'B8 before', 3000], ['b12a', 'B12 before', 1000], ['b8b', 'B8 after', 1500], ['b12b', 'B12 after', 2000]],
      ([id, lab, v]) => `<div><label for="${id}">${lab}</label><input id="${id}" type="number" min="0" max="20000" value="${v}"></div>`)}
  </div><p class="readout" id="calc"></p></div>`;

  const slidersHost = $('#sl'), sceneHost = $('#sl2'), inputs = {};
  const S = (host, id, label, min, max, step, fmt = v => v) =>
    (inputs[id] = slider(host, { id, label, min, max, step, value: st[id], fmt }, v => { st[id] = v; run(); }));
  S(slidersHost, 'main', `Main burn: dNBR >`, 0, 1, 0.01);
  S(slidersHost, 't1', 'Zone 1: dNBR >', 0, 1, 0.01); S(slidersHost, 't2', 'Zone 2: dNBR >', 0, 1, 0.01);
  S(slidersHost, 't3', 'Zone 3: dNBR >', 0, 1.5, 0.01); S(slidersHost, 'hot', 'Hotspot: dNBR >', 0, 1.5, 0.01);
  S(slidersHost, 'mainMin', 'Keep burn polygons > (ha)', 0, 50, 0.5);
  S(slidersHost, 'hotMin', 'Keep hotspot polygons > (ha)', 0, 10, 0.1);
  S(sceneHost, 'burn', 'Invented burn strength', 0, 1, 0.05);
  const setVal = (id, v) => { st[id] = v; inputs[id].value = v; inputs[id].dispatchEvent(new Event('input')); };
  $('#ctl .seg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $('#ctl .seg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    const z = b.dataset.set === 'script' ? [script.t1, script.t2, script.t3] : [0.1, 0.27, 0.66];
    ['t1', 't2', 't3'].forEach((k, i) => setVal(k, z[i]));
  });
  $('#eight').addEventListener('change', e => { st.eight = e.target.checked; run(); });
  $('#reseed').onclick = () => { st.seed = 1 + Math.floor(Math.random() * 1e6); run(); };

  let scene, cls;
  const cvs = ['pre', 'post', 'd', 'z'].map(k => $('#cv-' + k));
  function run() {
    scene = makeScene({ seed: st.seed, burn: st.burn });
    cls = E.classify(scene, { mainBurn: st.main, zones: [st.t1, st.t2, st.t3], hotspot: st.hot });
    const s = E.summarise(cls, { mainMinHa: st.mainMin, hotMinHa: st.hotMin, eightConnected: st.eight });
    const { w, h } = scene;
    paint(cvs[0], w, h, i => nbrRGB(cls.nbrPre[i])); paint(cvs[1], w, h, i => nbrRGB(cls.nbrPost[i]));
    paint(cvs[2], w, h, i => dRGB(cls.d[i]));
    const zc = paint(cvs[3], w, h, i => ZONE_RGB[cls.zone[i]]);
    outline(zc, w, h, s.main, '#000', 2); outline(zc, w, h, s.hot, '#ffd23f', 2);
    if (st.pick !== null) { zc.strokeStyle = '#fff'; zc.lineWidth = 2; zc.strokeRect((st.pick % w) * K, Math.floor(st.pick / w) * K, K, K); }
    const ha = n => (n * s.pixelHa).toFixed(2);
    $('#sum').innerHTML = `<div class="scroll"><table><thead><tr><th>Synthetic grid (30 m pixels, ${s.pixelHa} ha each)</th><th>pixels</th><th>ha</th></tr></thead><tbody>
      ${list([0, 1, 2, 3], z => `<tr><td>${z ? `<span class="swatch" style="background:rgb(${ZONE_RGB[z]})"></span>zone ${z}` : 'zone 0 (masked)'}</td><td>${s.counts[z]}</td><td>${ha(s.counts[z])}</td></tr>`)}
      <tr><td>Main-burn polygons kept (&gt; ${st.mainMin} ha)</td><td>${s.main.length}</td><td>${s.mainHa.toFixed(2)}</td></tr>
      <tr><td>Hotspot polygons kept (&gt; ${st.hotMin} ha)</td><td>${s.hot.length}</td><td>${s.hotHa.toFixed(2)}</td></tr>
      </tbody></table></div>
      <p class="small mute">The script's own filters are ${m.area_filters.map(f => `&gt; ${Number(f.min_ha).toLocaleString('en')} ha`).join(' and ')};
      this whole synthetic grid is only ${(w * h * s.pixelHa).toFixed(0)} ha, so the demo's minimum areas are adjustable instead.
      ${s.main.length > 1 ? `With ${s.main.length} burn polygons kept, the script's printed total (line ${m.prints[0].line}, the first polygon only) would not be their sum.` : ''}</p>`;
    pixel();
  }
  function pixel() {
    const i = st.pick;
    if (i === null) { $('#pix').innerHTML = '<span class="mute">No pixel selected.</span>'; return; }
    const f = v => (Number.isNaN(v) ? 'masked' : v.toFixed(3));
    $('#pix').innerHTML = `pixel (${i % scene.w}, ${Math.floor(i / scene.w)}) <span class="synth">synthetic</span><br>
      before: (${scene.pre.nir[i]} − ${scene.pre.swir2[i]}) / (${scene.pre.nir[i]} + ${scene.pre.swir2[i]}) = ${f(cls.nbrPre[i])}<br>
      after:&nbsp; (${scene.post.nir[i]} − ${scene.post.swir2[i]}) / (${scene.post.nir[i]} + ${scene.post.swir2[i]}) = ${f(cls.nbrPost[i])}<br>
      dNBR = ${f(cls.nbrPre[i])} − ${f(cls.nbrPost[i])} = <b>${f(cls.d[i])}</b> → zone ${cls.zone[i] || '0 (masked)'}${cls.hot[i] ? ', hotspot' : ''}`;
  }
  cvs.forEach(cv => cv.addEventListener('click', e => {
    const r = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / r.width * scene.w), y = Math.floor((e.clientY - r.top) / r.height * scene.h);
    st.pick = y * scene.w + x; run();
  }));
  const calc = () => {
    const v = id => +$('#' + id).value;
    const a = E.nbr(v('b8a'), v('b12a')), b = E.nbr(v('b8b'), v('b12b')), d = E.dnbr(a, b);
    const f = x => (Number.isNaN(x) ? 'masked (0 / 0)' : x.toFixed(4));
    $('#calc').innerHTML = `NBR before ${f(a)} · NBR after ${f(b)} · dNBR <b>${f(d)}</b> → with the script's thresholds: zone
      ${E.zone(d, m.zones.gt) || '0 (masked)'}${E.gt(d, m.hotspots.gt) ? ', hotspot' : ''}${E.gt(d, m.main_burn.gt) ? ', main burn' : ''}`;
  };
  ['b8a', 'b12a', 'b8b', 'b12b'].forEach(id => $('#' + id).addEventListener('input', calc));
  calc(); run();
});
