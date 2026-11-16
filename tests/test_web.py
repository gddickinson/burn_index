"""Web interface tests: every exported endpoint answers, the static build is complete, and the JS engine tests pass.

Run: python -m pytest -q tests/test_web.py
"""
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from web.app import STATIC, STATIC_ENDPOINTS, app  # noqa: E402

client = TestClient(app)


def test_index_served():
    r = client.get("/")
    assert r.status_code == 200 and "static/main.js" in r.text


@pytest.mark.parametrize("path", STATIC_ENDPOINTS)
def test_endpoint(path):
    r = client.get("/api" + path)
    assert r.status_code == 200, r.text
    assert r.json() is not None


def test_static_build(tmp_path):
    sys.path.insert(0, str(ROOT / "scripts"))
    import build_static
    build_static.build(tmp_path / "site")
    assert (tmp_path / "site" / "index.html").read_text().count("APP_STATIC") == 1
    for path in STATIC_ENDPOINTS:
        assert (tmp_path / "site" / "api" / (path.strip("/") + ".json")).exists()


def test_static_assets_referenced_exist():
    html = (STATIC / "index.html").read_text()
    for name in ("style.css", "main.js"):
        assert f"static/{name}" in html and (STATIC / name).exists()


@pytest.mark.skipif(not shutil.which("node"), reason="node not installed")
def test_js_engine():
    tests = sorted(STATIC.glob("*.test.mjs"))
    for t in tests:
        r = subprocess.run(["node", str(t)], capture_output=True, text=True)
        assert r.returncode == 0, r.stdout + r.stderr


# --- project-specific -----------------------------------------------------------------------------------------------
from web import gee_script  # noqa: E402


def test_method_parsed_from_script():
    m = client.get("/api/method").json()
    src = gee_script.SCRIPT.read_text().splitlines()
    assert m["collection"]["id"] == "COPERNICUS/S2"
    assert [p["start"] for p in m["periods"]] == ["2016-08-01", "2017-08-01", "2018-08-01"]
    assert (m["nbr"]["nir"], m["nbr"]["swir2"]) == ("B8", "B12")
    assert (m["change"]["pre"], m["change"]["post"]) == (2016, 2018)
    assert m["zones"]["gt"] == [0.1, 0.65, 0.8] and m["hotspots"]["gt"] == 0.65 and m["main_burn"]["gt"] == 0.1
    assert [f["min_ha"] for f in m["area_filters"]] == [10000, 2]
    assert len(m["polygon"]["vertices"]) == 45
    # every cited line really holds what it is cited for
    assert "change_nbr = nbr_2016.subtract(nbr_2018)" in src[m["change"]["line"] - 1]
    assert "var zones" in src[m["zones"]["line"] - 1] and "var hotspots" in src[m["hotspots"]["line"] - 1]
    assert "errorMargin" in src[m["error_margin"]["line"] - 1]
    for p in m["periods"]:
        assert p["start"] in src[p["line"] - 1]
    for f in m["area_filters"]:
        assert "areaHa" in src[f["line"] - 1]
    assert "print(" in src[m["prints"][0]["line"] - 1]


def test_cited_fixed_lines_in_pages():
    """Line numbers written into the page modules (not parsed) must still point at the right code."""
    src = gee_script.SCRIPT.read_text().splitlines()
    expect = {73: "s2_2018_clip", 78: "s2_2016_mosaic", 84: "TOA reflectance", 102: "Map.addLayer(s2_2018_mosaic",
              121: "palette: ['red', 'white', 'green']", 127: "palette: ['white', 'red']", 129: "Uncomment to export raster",
              153: "reduceToVectors", 156: "scale: 30", 176: "'0000FF', '00FF00', 'FF0000'", 201: "palette: 'red'",
              203: "Uncomment to export table", 211: "*/"}
    for line, text in expect.items():
        assert text in src[line - 1], (line, src[line - 1])
    assert len(src) == 211


def test_files_and_404():
    files = client.get("/api/files").json()
    assert [f["name"] for f in files] == ["Sentinel 2 Burn Index.js", "README.md", "LICENSE"]
    f = client.get("/api/file/Sentinel-2-Burn-Index.js").json()
    assert f["text"] == gee_script.SCRIPT.read_text() and f["outline"][0]["line"] == 50
    assert client.get("/api/file/run_web.py").status_code == 404
    assert client.get("/api/file/..%2F.git%2Fconfig").status_code == 404
