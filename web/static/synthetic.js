// SYNTHETIC reflectance grid for the demo. These numbers are invented to show the arithmetic of the script; they are
// not Sentinel-2 data, not the study area, and not a result. Values are on the Sentinel-2 Level-1C scale the script
// notes on line 84 (reflectance x 10000) and only use the two bands the NBR needs: B8 (NIR) and B12 (SWIR 2).
import { rng } from './core.js';

// Smooth value noise in [0, 1) on a coarse lattice, bilinearly interpolated (gives patchy "fields", not salt noise).
function smoothNoise(w, h, cell, rand) {
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
  const g = Array.from({ length: gw * gh }, rand);
  const out = new Float64Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = x / cell, fy = y / cell, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const v = (i, j) => g[j * gw + i];
    out[y * w + x] = (v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx) * (1 - ty) + (v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx) * ty;
  }
  return out;
}

// Build a pre-fire and a post-fire grid. `burn` (0..1) scales how strongly the invented fire lowers NIR and raises
// SWIR 2 inside an irregular patch of radius `radius` (fraction of the grid); `noise` adds year-to-year change
// everywhere so that unburned pixels also move a little.
export function makeScene({ w = 72, h = 48, seed = 7, burn = 0.9, radius = 0.32, noise = 0.06 } = {}) {
  const rand = rng(seed);
  const veg = smoothNoise(w, h, 9, rand), soil = smoothNoise(w, h, 14, rand), shape = smoothNoise(w, h, 6, rand);
  const yearA = smoothNoise(w, h, 5, rand), yearB = smoothNoise(w, h, 5, rand);
  const n = w * h;
  const pre = { nir: new Float64Array(n), swir2: new Float64Array(n) };
  const post = { nir: new Float64Array(n), swir2: new Float64Array(n) };
  const severity = new Float64Array(n);
  const cx = w * 0.45, cy = h * 0.5, r = radius * Math.min(w, h) * 1.4;
  for (let i = 0; i < n; i++) {
    const x = i % w, y = (i - x) / w;
    const bare = soil[i] > 0.72;                         // a few patches of bare ground
    pre.nir[i] = bare ? 2300 + 300 * veg[i] : 2600 + 1200 * veg[i];
    pre.swir2[i] = bare ? 1900 + 300 * veg[i] : 700 + 600 * (1 - veg[i]);
    const dist = Math.hypot((x - cx) / 1.35, y - cy) / r + 0.45 * (shape[i] - 0.5);
    const s = bare ? 0 : Math.max(0, Math.min(1, (1 - dist) * 1.8)) * burn;
    severity[i] = s;
    const drift = 1 + noise * (yearA[i] - 0.5) * 2, drift2 = 1 + noise * (yearB[i] - 0.5) * 2;
    post.nir[i] = Math.round(pre.nir[i] * drift * (1 - 0.7 * s));
    post.swir2[i] = Math.round(pre.swir2[i] * drift2 * (1 + 1.6 * s));
    pre.nir[i] = Math.round(pre.nir[i]); pre.swir2[i] = Math.round(pre.swir2[i]);
  }
  return { w, h, pre, post, severity, synthetic: true };
}
