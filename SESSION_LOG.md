# SESSION_LOG

## 2026-11-16: web showcase and GitHub Pages site (branch `web-interface`)
- The project is one Google Earth Engine script, which only runs in the Earth Engine Code Editor, so the site is a
  showcase (webkit SHOWCASE.md): Home, How it works (every value parsed from the script by `web/gee_script.py`, each
  step linked to its lines, SVG data-flow diagram), Demo, Code (explorer with highlighting, outline, search), About
  (how to run it in the Code Editor, copy/download the script).
- Demo: `web/static/burn_engine.js` ports the script's raster maths (NBR line 111, dNBR line 126, strict `gt`
  thresholds 142-149, 4-connected regions 153-171, hectares and strict area filters 179-190) and runs it on a seeded
  SYNTHETIC B8/B12 grid (`synthetic.js`), labelled as invented on the page. Node test `burn_engine.test.mjs`:
  hand-traced cases + checks the script still contains the ported formulas.
- `web/app.py` (port 8252), `run_web.py`, `scripts/build_static.py`, `scripts/screenshots.py`, `tests/test_web.py`
  (endpoints, parsed facts, every hard-coded line citation still points at the right code), Pages workflow.
- README corrected: removed the via.placeholder.com "example" image (not a result); the severity table is now marked
  as general reference classes, since the script's zones use 0.1 / 0.65 / 0.8 (table: 0.1 / 0.27 / 0.66).
- Needs George's decision (script not changed, cannot be run here): line 192 prints the area of the *first* polygon
  above 10,000 ha as the "total burn size"; if several pass the filter the total is understated (line 193 sums the
  hotspots instead). `COPERNICUS/S2` is deprecated in the current Earth Engine catalog (harmonized collection replaces it).
