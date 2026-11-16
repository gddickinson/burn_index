// Node test for burn_engine.js against values worked by hand from the script's formulas and thresholds
// (`Sentinel 2 Burn Index.js` lines 111, 126, 142-149, 153-171, 179-190). Earth Engine cannot run here, so each
// expected value below is traced from the code in a comment. Run: node web/static/burn_engine.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as E from './burn_engine.js';
import { makeScene } from './synthetic.js';

const close = (a, b, tol = 1e-12) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);
const T = { mainBurn: 0.1, zones: [0.1, 0.65, 0.8], hotspot: 0.65 };   // the script's values (lines 142, 145, 148)

// Line 111: NBR = (B8 - B12) / (B8 + B12)
close(E.nbr(3000, 1000), 0.5);                    // 2000 / 4000
close(E.nbr(1500, 2000), -500 / 3500);            // -0.142857...
close(E.nbr(1000, 1000), 0);
assert.ok(Number.isNaN(E.nbr(0, 0)));             // 0/0: Earth Engine masks the pixel
// Line 126: change = pre (2016) - post (2018)
close(E.dnbr(0.5, -500 / 3500), 0.5 + 1 / 7);     // 0.642857...: above 0.1, not above 0.65
assert.equal(E.zone(0.5 + 1 / 7, T.zones), 1);
// Strict gt at the thresholds (ee.Image.gt):
assert.equal(E.zone(0.1, T.zones), 0);            // exactly 0.1 -> not burned, masked
assert.equal(E.zone(0.100001, T.zones), 1);
assert.equal(E.zone(0.65, T.zones), 1);           // exactly 0.65 -> zone 1, not a hotspot
assert.equal(E.zone(0.7, T.zones), 2);
assert.equal(E.zone(0.8, T.zones), 2);
assert.equal(E.zone(0.85, T.zones), 3);
assert.equal(E.zone(-0.3, T.zones), 0);           // NBR rose (regrowth): masked
assert.equal(E.zone(NaN, T.zones), 0);

// classify on a 3x2 grid, pixel by pixel:
//  p0 pre 3000/1000 (0.5)  post 3000/1000 (0.5)   dNBR 0      -> zone 0
//  p1 pre 3000/1000 (0.5)  post 2000/1500 (1/7)   dNBR 0.357  -> zone 1, main burn, no hotspot
//  p2 pre 3000/1000 (0.5)  post 1000/2000 (-1/3)  dNBR 0.833  -> zone 3, hotspot
//  p3 pre 4000/1000 (0.6)  post 1500/1500 (0)     dNBR 0.6    -> zone 1
//  p4 pre 4000/1000 (0.6)  post 1000/1500 (-0.2)  dNBR 0.8    -> zone 2 (0.8 is not > 0.8), hotspot
//  p5 pre 0/0 (masked)                                         -> 0
const scene = { w: 3, h: 2,
  pre: { nir: [3000, 3000, 3000, 4000, 4000, 0], swir2: [1000, 1000, 1000, 1000, 1000, 0] },
  post: { nir: [3000, 2000, 1000, 1500, 1000, 0], swir2: [1000, 1500, 2000, 1500, 1500, 0] } };
const c = E.classify(scene, T);
close(c.d[1], 0.5 - 1 / 7); close(c.d[2], 0.5 + 1 / 3); close(c.d[3], 0.6); close(c.d[4], 0.8, 1e-12);
assert.deepEqual([...c.zone], [0, 1, 3, 1, 2, 0]);
assert.deepEqual([...c.main], [0, 1, 1, 1, 1, 0]);
assert.deepEqual([...c.hot], [0, 0, 1, 0, 1, 0]);

// regions (reduceToVectors, eightConnected: false). Main burn mask
//   0 1 1
//   1 1 0      -> one 4-connected region of 4 pixels, mean dNBR = (0.357+0.833+0.6+0.8)/4
const mr = E.regions(c.main, 3, 2, c.d);
assert.equal(mr.length, 1); assert.equal(mr[0].pixels, 4);
close(mr[0].meanD, (c.d[1] + c.d[2] + c.d[3] + c.d[4]) / 4);
// Hotspots  0 0 1 / 0 1 0: diagonal neighbours -> 2 regions with edges only, 1 region if eight-connected
assert.equal(E.regions(c.hot, 3, 2, c.d).length, 2);
assert.equal(E.regions(c.hot, 3, 2, c.d, true).length, 1);

// Lines 179-190: areaHa = m^2 / (100*100); a 30 m pixel is 900 m^2 = 0.09 ha; filters are strict (>).
close(E.areaHa(1, 30), 0.09); close(E.areaHa(4, 30), 0.36); close(E.areaHa(1, 10), 0.01);
assert.equal(E.filterByArea(mr, 0.36).length, 0);     // 0.36 is not > 0.36
assert.equal(E.filterByArea(mr, 0.35).length, 1);
const s = E.summarise(c, { scale: 30, mainMinHa: 0, hotMinHa: 0 });
assert.deepEqual(s.counts, [2, 2, 1, 1]);
close(s.mainHa, 0.36); close(s.hotHa, 0.18); assert.equal(s.hot.length, 2);

// The engine's defaults equal what the script says (parsed from the file, so a change there fails this test).
const src = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../Sentinel 2 Burn Index.js'), 'utf8');
assert.match(src, /nir_2018\.subtract\(sir2_2018\)\.divide\(nir_2018\.add\(sir2_2018\)\)/);
assert.match(src, /var change_nbr = nbr_2016\.subtract\(nbr_2018\);/);
assert.match(src, /var zones = change_nbr\.gt\(0\.1\)\.add\(change_nbr\.gt\(0\.65\)\)\.add\(change_nbr\.gt\(0\.8\)\);/);
assert.match(src, /var mainBurn = change_nbr\.gt\(0\.1\);/);
assert.match(src, /var hotspots = change_nbr\.gt\(0\.65\);/);
assert.match(src, /eightConnected: false/);
assert.match(src, /divide\(100 \* 100\)/);

// The synthetic scene is reproducible (seeded) and, with burn = 0, has no pixel above the high thresholds.
const a = makeScene({ seed: 3 }), b = makeScene({ seed: 3 });
assert.deepEqual([...a.post.nir.slice(0, 50)], [...b.post.nir.slice(0, 50)]);
assert.equal(a.synthetic, true);
const calm = E.classify(makeScene({ seed: 3, burn: 0 }), T);
assert.equal([...calm.zone].filter(z => z >= 2).length, 0);
const fire = E.summarise(E.classify(makeScene({ seed: 3 }), T), { mainMinHa: 1, hotMinHa: 0.2 });
assert.ok(fire.counts[3] > 0 && fire.main.length >= 1);

console.log('burn_engine: ok');
