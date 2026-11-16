"""Read the facts of the method straight out of `Sentinel 2 Burn Index.js` (the Earth Engine script), with line numbers.

The script cannot run outside Google Earth Engine, so the site explains it instead; every number the site shows
(collection, dates, cloud limit, bands, NBR bands, which years are differenced, thresholds, vector scale, area
filters, the study-area polygon) is parsed here from the script text, never typed in by hand.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "Sentinel 2 Burn Index.js"


def _lines():
    return SCRIPT.read_text(encoding="utf-8").splitlines()


def _find(pattern, lines, flags=0):
    """All (line_number, match) for a regex, 1-based line numbers."""
    rx = re.compile(pattern, flags)
    return [(i, m) for i, line in enumerate(lines, 1) for m in [rx.search(line)] if m]


def _first(pattern, lines):
    hits = _find(pattern, lines)
    if not hits:
        raise ValueError(f"pattern not found in the script: {pattern}")
    return hits[0]


def polygon(lines):
    """The study-area polygon: vertices (lon, lat), its bounding box and the line range."""
    start, _ = _first(r"var studyarea\s*=", lines)
    end, _ = _first(r"\]\]\]\)", lines)
    pts = [(float(a), float(b)) for a, b in re.findall(r"\[(-?\d+\.\d+),\s*(-?\d+\.\d+)\]", "\n".join(lines[start - 1:end]))]
    lons, lats = [p[0] for p in pts], [p[1] for p in pts]
    return {"vertices": pts, "lines": [start, end], "bbox": {"west": min(lons), "east": max(lons),
            "south": min(lats), "north": max(lats)}}


def method():
    """Everything the How-it-works and Demo pages need, each value with the line it comes from."""
    L = _lines()
    ln, m = _first(r'ee\.ImageCollection\("([^"]+)"\)', L)
    collection = {"id": m.group(1), "line": ln}
    periods = [{"var": m.group(1), "start": m.group(2), "end": m.group(3), "line": ln}
               for ln, m in _find(r"var (s2_\d{4}) = s2_collection\.filterDate\('([\d-]+)',\s*'([\d-]+)'\)", L)]
    clouds = sorted({int(m.group(1)) for _, m in _find(r"CLOUD_COVERAGE_ASSESSMENT',\s*(\d+)\)", L)})
    ln, m = _first(r"\.select\(\[([^\]]+)\]\)", L)
    bands = {"list": re.findall(r"'(\w+)'", m.group(1)), "line": ln}
    nir = _first(r"var nir_\d{4} = \w+\.select\('(\w+)'\)", L)
    swir = _first(r"var sir2_\d{4} = \w+\.select\('(\w+)'\)", L)
    nbr = _first(r"var nbr_\d{4} = nir_\d{4}\.subtract\(sir2_\d{4}\)\.divide\(nir_\d{4}\.add\(sir2_\d{4}\)\)", L)
    ln, m = _first(r"var change_nbr = nbr_(\d{4})\.subtract\(nbr_(\d{4})\)", L)
    change = {"pre": int(m.group(1)), "post": int(m.group(2)), "line": ln}
    computed_years = sorted(int(m.group(1)) for _, m in _find(r"var nbr_(\d{4}) =", L))
    ln, m = _first(r"var mainBurn = change_nbr\.gt\(([\d.]+)\)", L)
    main_burn = {"gt": float(m.group(1)), "line": ln}
    ln, m = _first(r"var zones = (change_nbr\.gt\([\d.]+\).*);", L)
    zones = {"gt": [float(x) for x in re.findall(r"change_nbr\.gt\(([\d.]+)\)", m.group(1))], "line": ln}
    ln, m = _first(r"var hotspots = change_nbr\.gt\(([\d.]+)\)", L)
    hotspots = {"gt": float(m.group(1)), "line": ln}
    scales = sorted({int(m.group(1)) for _, m in _find(r"scale:\s*(\d+),\s*//", L)})
    eight = sorted({m.group(1) for _, m in _find(r"eightConnected:\s*(\w+)", L)})
    ln, m = _first(r"var errorMargin = (\d+);", L)
    error_margin = {"m": int(m.group(1)), "line": ln}
    area_filters = [{"var": m.group(1), "min_ha": float(m.group(2)), "line": ln}
                    for ln, m in _find(r"var (\w+) = \w+\.filter\(ee\.Filter\.gt\('areaHa',\s*([\d.]+)\)\)", L)]
    prints = [{"label": m.group(1), "line": ln} for ln, m in _find(r"print\('([^']+)'", L)]
    return {
        "script": SCRIPT.name, "collection": collection, "periods": periods, "cloud_lt": clouds, "bands": bands,
        "nbr": {"nir": nir[1].group(1), "swir2": swir[1].group(1), "line": nbr[0], "nir_line": nir[0], "swir2_line": swir[0],
                "years": computed_years},
        "change": change, "main_burn": main_burn, "zones": zones, "hotspots": hotspots,
        "vector": {"scale_m": scales, "eight_connected": eight}, "error_margin": error_margin,
        "area_filters": area_filters, "prints": prints, "polygon": polygon(L),
    }


# The project's own files shown in the code explorer (the web wrapper's files are not part of the project's code).
PROJECT_FILES = ["Sentinel 2 Burn Index.js", "README.md", "LICENSE"]


def outline(text):
    """Section comments of the script (prose comments, not commented-out code or the band table), with line numbers."""
    out = []
    for i, line in enumerate(text.splitlines(), 1):
        s = line.strip()
        body = s.strip("/ ").strip()
        if s.startswith("//") and body and body[0].isupper() and "\t" not in line and "Map." not in body \
                and not re.match(r"B\d", body) and "addLayer" not in body:
            out.append({"line": i, "text": body})
    return out


def files():
    """The project's files (the code explorer), with size, lines and a summary taken from the file itself."""
    out = []
    for name in PROJECT_FILES:
        p = ROOT / name
        text = p.read_text(encoding="utf-8")
        out.append({"name": p.name, "bytes": p.stat().st_size, "lines": len(text.splitlines()),
                    "language": {".js": "javascript", ".md": "markdown"}.get(p.suffix, "text"),
                    "summary": summary(p.name, text), "outline": outline(text) if p.suffix == ".js" else []})
    return out


def summary(name, text):
    """A one-line summary from the file itself: the README's first paragraph, the licence title; the script has no
    header comment, so its summary says so and the outline lists its section comments."""
    if name.endswith(".md"):
        paras = [b.strip() for b in text.split("\n\n") if b.strip() and not b.lstrip().startswith(("#", "[!", "!"))]
        return paras[0] if paras else ""
    if name == "LICENSE":
        return text.splitlines()[0].strip()
    return "Google Earth Engine Code Editor script (no header comment; see the section comments in the outline)."


def file_text(name):
    return (ROOT / name).read_text(encoding="utf-8") if name in PROJECT_FILES else None
