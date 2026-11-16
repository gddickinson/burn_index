"""FastAPI web app for the Sentinel-2 burn index showcase: front end in static/, JSON API under /api.

The Earth Engine script itself only runs in the Google Earth Engine Code Editor; this app serves facts parsed from it
(web/gee_script.py), the project's files for the code explorer, and the front end whose demo applies the script's
NBR / dNBR / threshold maths to a synthetic grid in the browser. Run with `python run_web.py` (http://127.0.0.1:8252,
local only). `scripts/build_static.py` exports every path in STATIC_ENDPOINTS to JSON for the GitHub Pages site.
"""
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from web import gee_script

STATIC = Path(__file__).resolve().parent / "static"

app = FastAPI(title="Sentinel-2 Burn Index")
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC / "index.html")


def file_slug(name: str) -> str:
    """URL/file-safe id for a project file ('Sentinel 2 Burn Index.js' -> 'Sentinel-2-Burn-Index.js')."""
    return name.replace(" ", "-")


@app.get("/api/info")
def info():
    """Counts for the home page, all from the repo."""
    m, fs = gee_script.method(), gee_script.files()
    return {"title": "Sentinel-2 Burn Index", "files": len(fs), "script": m["script"],
            "script_lines": next(f["lines"] for f in fs if f["name"] == m["script"]),
            "bands": len(m["bands"]["list"]), "years": len(m["periods"]), "vertices": len(m["polygon"]["vertices"]),
            "thresholds": len(m["zones"]["gt"])}


@app.get("/api/method")
def method():
    """Every fact of the method, parsed from the script with its line number."""
    return gee_script.method()


@app.get("/api/files")
def files():
    return [{**f, "slug": file_slug(f["name"])} for f in gee_script.files()]


@app.get("/api/file/{slug}")
def file(slug: str):
    for f in gee_script.files():
        if file_slug(f["name"]) == slug:
            return {**f, "slug": slug, "text": gee_script.file_text(f["name"]),
                    "github": "https://github.com/gddickinson/burn_index/blob/main/" + quote(f["name"])}
    raise HTTPException(404, "no such file")


# GET paths (without the /api prefix) written to the static site as api/<path>.json.
STATIC_ENDPOINTS = ["/info", "/method", "/files"] + [f"/file/{file_slug(f['name'])}" for f in gee_script.files()]
