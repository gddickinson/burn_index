# INTERFACE.md: navigation map of `burn_index`

| Path | What it is |
|------|------------|
| `Sentinel 2 Burn Index.js` | the project: a Google Earth Engine Code Editor script. Study-area polygon (lines 1-46), `COPERNICUS/S2` August 2016/2017/2018 image sets (52-60), band selection, clip + mosaic (65-78), NBR per year (106-119), dNBR 2016 − 2018 (126), thresholds (141-149), `reduceToVectors` (152-171), areas and filters (178-190), prints and map layers (192-201), commented-out exports |
| `README.md`, `LICENSE` | description, usage, theory; MIT |

## Web showcase (`web/`)
| Path | What it is |
|------|------------|
| `run_web.py` | starts uvicorn on 127.0.0.1:8252 |
| `web/app.py` | FastAPI: `/api/info`, `/api/method`, `/api/files`, `/api/file/{slug}`; `STATIC_ENDPOINTS` |
| `web/gee_script.py` | parses the script: `method()` (every fact with its line), `files()`/`outline()`/`summary()`, `PROJECT_FILES` |
| `web/static/index.html`, `style.css` (kit), `style_app.css`, `core.js` (kit), `main.js`, `static_api.js` | shell |
| `web/static/home.js`, `method.js`, `demo.js`, `code.js`, `about.js` | pages (How it works cites script lines; Code is the explorer) |
| `web/static/burn_engine.js` | the script's raster maths in JS: `nbr`, `dnbr`, `gt`, `zone`, `classify`, `regions` (4/8-connected), `areaHa`, `filterByArea`, `summarise` |
| `web/static/synthetic.js` | `makeScene()`: seeded SYNTHETIC B8/B12 grid for the demo (invented values, labelled as such) |
| `web/static/highlight.js` | tiny JS syntax highlighter for the code explorer |
| `web/static/burn_engine.test.mjs` | node test: hand-worked NBR/dNBR/zone/region/area cases + the script still holds the ported formulas |
| `scripts/build_static.py`, `scripts/screenshots.py` | static export to `site/`; Playwright smoke test and README images (`docs/img/`) |
| `tests/test_web.py` | pytest: endpoints, parsed facts and cited lines, static build, node test |
| `.github/workflows/pages.yml` | publishes the static site on push to `main` |
