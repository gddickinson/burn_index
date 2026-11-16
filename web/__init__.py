"""Web showcase for the Sentinel-2 burn index Earth Engine script.

Contents:
    app.py        FastAPI app: front end at /, JSON API under /api (method facts, file list, file contents)
    gee_script.py parses `Sentinel 2 Burn Index.js` (collection, dates, bands, NBR, thresholds, area filters, polygon)
    static/       ES-module front end; burn_engine.js is the NBR/dNBR/threshold maths run on a synthetic grid
"""
