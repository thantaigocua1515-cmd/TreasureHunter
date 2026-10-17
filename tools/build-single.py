#!/usr/bin/env python3
"""Gộp toàn bộ client thành 1 file HTML duy nhất (để up host tĩnh / itch.io)."""
import re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "dist" / "treasure-hunter-survival-demo.html"

CSS = ["client/css/style.css"]
JS = [
    "shared/protocol.js",
    "client/js/sprites.js",
    "client/js/sunny-data.js",
    "client/js/sunny.js",
    "client/js/input.js",
    "client/js/net.js",
    "client/js/ui.js",
    "client/js/renderer.js",
    "client/js/game.js",
    "client/js/main.js",
]

html = (ROOT / "client/index.html").read_text()

css = "\n".join((ROOT / p).read_text() for p in CSS)
html = html.replace('<link rel="stylesheet" href="css/style.css">', "<style>\n" + css + "\n</style>")

scripts = []
for p in JS:
    src = (ROOT / p).read_text()
    src = src.replace("</script", "<\\/script")  # chống bể tag
    scripts.append(f'<script>\n/* ==== {p} ==== */\n{src}\n</script>')
block = "\n".join(scripts)
html = re.sub(r'(<script src="[^"]+"></script>\n?)+', block + "\n", html)

OUT.parent.mkdir(exist_ok=True)
OUT.write_text(html)
print(f"OK → {OUT} ({OUT.stat().st_size/1024:.0f} KB)")
