// The raster maths of `Sentinel 2 Burn Index.js`, ported to plain JavaScript so it can run on a small grid in the
// browser. Each function names the script lines it mirrors. Earth Engine itself (image collections, mosaics, map
// layers, geodesic polygon areas) is not reproduced: the demo feeds these functions a SYNTHETIC grid (synthetic.js).

// Lines 109-119: NBR = (B8 - B12) / (B8 + B12). Earth Engine masks a pixel whose denominator is 0; here that is NaN.
export function nbr(nir, swir2) {
  const den = nir + swir2;
  return den === 0 ? NaN : (nir - swir2) / den;
}

// Line 126: change_nbr = nbr_2016.subtract(nbr_2018), i.e. pre-fire minus post-fire (dNBR). Positive = NBR dropped.
export const dnbr = (pre, post) => pre - post;

// ee.Image.gt: 1 where strictly greater, else 0.
export const gt = (x, t) => (x > t ? 1 : 0);

// Line 145: zones = gt(t1) + gt(t2) + gt(t3) -> 0..3; line 146 masks zone 0 (updateMask(zones.gt(0.1))). 0 = masked.
export function zone(d, thresholds) {
  if (Number.isNaN(d)) return 0;
  return thresholds.reduce((s, t) => s + gt(d, t), 0);
}

// Whole-grid version: per-pixel NBR before/after, dNBR, zone, main-burn and hotspot masks (lines 142-149).
export function classify(scene, { mainBurn = 0.1, zones = [0.1, 0.65, 0.8], hotspot = 0.65 } = {}) {
  const n = scene.w * scene.h;
  const out = { w: scene.w, h: scene.h, nbrPre: new Float64Array(n), nbrPost: new Float64Array(n), d: new Float64Array(n),
    zone: new Uint8Array(n), main: new Uint8Array(n), hot: new Uint8Array(n) };
  for (let i = 0; i < n; i++) {
    const a = nbr(scene.pre.nir[i], scene.pre.swir2[i]), b = nbr(scene.post.nir[i], scene.post.swir2[i]);
    const d = dnbr(a, b);
    out.nbrPre[i] = a; out.nbrPost[i] = b; out.d[i] = d;
    out.zone[i] = zone(d, zones);
    out.main[i] = Number.isNaN(d) ? 0 : gt(d, mainBurn);
    out.hot[i] = Number.isNaN(d) ? 0 : gt(d, hotspot);
  }
  return out;
}

// Lines 153-171: reduceToVectors groups connected unmasked pixels into polygons (eightConnected: false = edges only)
// and, with reducer mean over the added change_nbr band, records each polygon's mean dNBR. Returns one entry per
// connected region of mask == 1: { pixels, meanD, cells }.
export function regions(mask, w, h, values, eightConnected = false) {
  const label = new Int32Array(w * h).fill(-1), out = [];
  const nb = eightConnected ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || label[start] >= 0) continue;
    const id = out.length, stack = [start], cells = [];
    label[start] = id;
    let sum = 0;
    while (stack.length) {
      const i = stack.pop(), x = i % w, y = (i - x) / w;
      cells.push(i); sum += values ? values[i] : 0;
      for (const [dx, dy] of nb) {
        const nx = x + dx, ny = y + dy, j = ny * w + nx;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && mask[j] && label[j] < 0) { label[j] = id; stack.push(j); }
      }
    }
    out.push({ pixels: cells.length, meanD: values ? sum / cells.length : NaN, cells });
  }
  return out;
}

// Lines 179-186: areaHa = geometry area (m^2) / (100 * 100). On a grid of square pixels of `scale` metres
// (line 156: scale 30) a region's area is pixels * scale^2 / 10000 ha.
export const areaHa = (pixels, scale = 30) => (pixels * scale * scale) / 10000;

// Lines 189-190: keep polygons whose areaHa is strictly greater than the minimum (ee.Filter.gt).
export function filterByArea(regs, minHa, scale = 30) {
  return regs.map(r => ({ ...r, areaHa: areaHa(r.pixels, scale) })).filter(r => r.areaHa > minHa);
}

// Summary used by the demo: pixel counts per zone and the filtered regions with their total area.
export function summarise(cls, { scale = 30, mainMinHa, hotMinHa, eightConnected = false }) {
  const counts = [0, 0, 0, 0];
  for (const z of cls.zone) counts[z]++;
  const main = filterByArea(regions(cls.main, cls.w, cls.h, cls.d, eightConnected), mainMinHa, scale);
  const hot = filterByArea(regions(cls.hot, cls.w, cls.h, cls.d, eightConnected), hotMinHa, scale);
  const total = rs => rs.reduce((s, r) => s + r.areaHa, 0);
  return { counts, main, hot, mainHa: total(main), hotHa: total(hot), pixelHa: areaHa(1, scale) };
}
