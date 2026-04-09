#!/usr/bin/env python3
"""
sandtray-figures.py — one-time fetcher + AI-cutout processor for sandtray figures.

Reads scripts/sandtray-figures.json, downloads each entry's URL, runs rembg
(BiRefNet by default — current SOTA for general-purpose background removal)
to produce a clean transparent cutout, trims to the alpha bounding box,
resizes to a max long edge, optimizes, and writes the result to
public/sandtray/figures/<id>.png.

Also emits a TypeScript-formatted snippet of figure metadata that can be
pasted into src/data/sandtrayFigures.ts.

Why rembg + BiRefNet instead of ImageMagick:
    Vintage scans have parchment, sepia, anti-aliased edges, and interior
    white regions (between bird wings, inside leaves). Heuristic flood-fill
    butchers them. AI segmentation models trained on millions of images
    handle them cleanly. BiRefNet (2024) is the current open-source SOTA
    for "subject on background" extraction and is MIT-licensed.

Usage:
    python3 scripts/sandtray-figures.py                    # process all
    python3 scripts/sandtray-figures.py <id> [<id> ...]    # process specific entries
    python3 scripts/sandtray-figures.py --check            # dry run, list sources
    python3 scripts/sandtray-figures.py --model isnet-general-use  # swap model
    python3 scripts/sandtray-figures.py --keep-raw         # keep downloaded originals
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow is required. Install with: pip install Pillow", file=sys.stderr)
    sys.exit(1)

try:
    from rembg import remove, new_session
except ImportError:
    print("ERROR: rembg is required. Install with: pip install 'rembg[cpu]'", file=sys.stderr)
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = REPO_ROOT / "scripts" / "sandtray-figures.json"
OUT_DIR = REPO_ROOT / "public" / "sandtray" / "figures"
RAW_DIR = REPO_ROOT / "scripts" / ".cache" / "sandtray-raw"
MAX_LONG_EDGE = 480
DEFAULT_MODEL = "birefnet-general"
USER_AGENT = (
    "SandtrayFigureFetcher/1.0 "
    "(https://github.com/sean/traumaSite; sean@thingvalla.tech) "
    "educational trauma-therapy reference, public-domain only"
)


# ----- Source list -----

def load_sources() -> list[dict]:
    if not JSON_PATH.exists():
        return []
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("figures", [])


# ----- Download with caching -----

def download_to_cache(url: str, fig_id: str) -> Path:
    """Download URL to scripts/.cache/sandtray-raw/<id>.<ext>. Skip if cached.

    Rate-limits to 1 request per 2s and retries on HTTP 429 with exponential
    backoff, since Wikimedia's CDN is strict about bulk fetching.
    """
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    # Guess extension from URL.
    ext = url.rsplit(".", 1)[-1].split("?")[0].lower()
    if ext not in ("jpg", "jpeg", "png", "gif", "tif", "tiff", "webp"):
        ext = "jpg"
    cached = RAW_DIR / f"{fig_id}.{ext}"
    if cached.exists() and cached.stat().st_size > 0:
        return cached
    # Polite pacing between uncached downloads.
    time.sleep(2.0)
    delay = 5.0
    for attempt in range(5):
        req = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "image/*"})
        try:
            with urlopen(req, timeout=60) as resp:
                cached.write_bytes(resp.read())
            return cached
        except HTTPError as e:
            if e.code == 429 and attempt < 4:
                print(f"  429 rate-limited, backing off {delay:.0f}s...", file=sys.stderr)
                time.sleep(delay)
                delay *= 2
                continue
            raise
    raise RuntimeError(f"exceeded retry budget for {url}")


# ----- Image ops (Pillow only) -----

def trim_alpha(img: Image.Image, padding: int = 4) -> Image.Image:
    """Crop to alpha bounding box with a few pixels of breathing room."""
    bbox = img.getbbox()
    if bbox is None:
        return img
    x0, y0, x1, y1 = bbox
    w, h = img.size
    x0 = max(0, x0 - padding)
    y0 = max(0, y0 - padding)
    x1 = min(w, x1 + padding)
    y1 = min(h, y1 + padding)
    return img.crop((x0, y0, x1, y1))


def resize_max_edge(img: Image.Image, max_edge: int = MAX_LONG_EDGE) -> Image.Image:
    w, h = img.size
    long_edge = max(w, h)
    if long_edge <= max_edge:
        return img
    scale = max_edge / float(long_edge)
    return img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)


# ----- Per-image pipeline -----

def process_one(entry: dict, session) -> tuple[bool, str]:
    fig_id = entry["id"]
    url = entry["url"]
    out_path = OUT_DIR / f"{fig_id}.png"

    try:
        cached = download_to_cache(url, fig_id)
    except HTTPError as e:
        return False, f"{fig_id}: HTTP {e.code} for {url}"
    except URLError as e:
        return False, f"{fig_id}: download failed: {e.reason}"
    except Exception as e:
        return False, f"{fig_id}: download error: {e}"

    try:
        raw_bytes = cached.read_bytes()
        cut_bytes = remove(raw_bytes, session=session)
    except Exception as e:
        return False, f"{fig_id}: rembg failed: {e}"

    try:
        from io import BytesIO
        img = Image.open(BytesIO(cut_bytes)).convert("RGBA")
        img = trim_alpha(img)
        img = resize_max_edge(img)
        img.save(out_path, "PNG", optimize=True)
    except Exception as e:
        return False, f"{fig_id}: save failed: {e}"

    size_kb = out_path.stat().st_size / 1024
    return True, f"{fig_id}: ok ({img.size[0]}x{img.size[1]}, {size_kb:.0f} KB)"


# ----- TS snippet emitter -----

def emit_ts_snippet(entries: list[dict]) -> str:
    """Emit a TS array snippet. Only entries whose PNGs actually landed."""
    lines = []
    for e in entries:
        out_path = OUT_DIR / f"{e['id']}.png"
        if not out_path.exists():
            continue
        lines.append("  {")
        lines.append(f"    id: {json.dumps(e['id'])},")
        lines.append(f"    src: '/sandtray/figures/{e['id']}.png',")
        lines.append(f"    alt: {{ en: {json.dumps(e['alt_en'])}, es: {json.dumps(e['alt_es'])} }},")
        lines.append(f"    category: {json.dumps(e['category'])},")
        lines.append(f"    defaultScale: {e.get('defaultScale', 1.0)},")
        lines.append(f"    source: {json.dumps(e.get('source', ''))},")
        lines.append("  },")
    return "\n".join(lines)


# ----- CLI -----

def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Fetch and process sandtray figures.")
    parser.add_argument("ids", nargs="*", help="If given, only process these figure ids.")
    parser.add_argument("--check", action="store_true", help="Dry run: list sources, do nothing.")
    parser.add_argument("--model", default=DEFAULT_MODEL,
                        help=f"rembg model name (default: {DEFAULT_MODEL}). "
                             f"Options: birefnet-general, birefnet-general-lite, "
                             f"isnet-general-use, u2net.")
    parser.add_argument("--keep-raw", action="store_true",
                        help="Keep cached raw downloads (default: kept anyway for re-runs).")
    args = parser.parse_args(argv[1:])

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sources = load_sources()
    if not sources:
        print(f"No figures listed in {JSON_PATH}.")
        return 0

    if args.check:
        for e in sources:
            print(f"  {e['id']:30s} {e['category']:10s} {e['url']}")
        print(f"\nTotal: {len(sources)} figures listed.")
        return 0

    targets = sources
    if args.ids:
        targets = [e for e in sources if e["id"] in args.ids]
        if not targets:
            print(f"No matching ids: {args.ids}")
            return 1

    # Force CPU execution provider. ONNXRuntime's CoreML EP spends many minutes
    # compiling the ~1GB BiRefNet graph to Apple Neural Engine on first run,
    # which dwarfs inference time. CPU inference is a few seconds per image and
    # needs no compile step.
    providers = ["CPUExecutionProvider"]
    print(f"Loading rembg model '{args.model}' (first run downloads ~340MB)...", file=sys.stderr)
    session = new_session(args.model, providers=providers)
    print(f"Model loaded. Processing {len(targets)} figures.\n", file=sys.stderr)

    ok = 0
    fails = []
    for e in targets:
        success, msg = process_one(e, session)
        prefix = "OK  " if success else "FAIL"
        print(f"{prefix}  {msg}")
        if success:
            ok += 1
        else:
            fails.append(e["id"])

    print(f"\nProcessed {ok}/{len(targets)} successfully.")
    if fails:
        print(f"Failed: {', '.join(fails)}")

    print("\n----- TS snippet (paste into src/data/sandtrayFigures.ts) -----")
    print(emit_ts_snippet(targets))
    return 0 if ok == len(targets) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
