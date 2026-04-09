#!/usr/bin/env python3
"""
sandtray-models.py — one-time fetcher for sandtray 3D models.

Reads scripts/sandtray-models.json, downloads each entry's URL into
public/sandtray/models/<file>, and writes public/sandtray/models/LICENSE.txt
with the attribution block. Idempotent: re-running skips files that already
exist.

Also emits a TypeScript-formatted snippet of figure metadata ready to paste
into src/data/sandtrayFigures.ts.

Usage:
    python3 scripts/sandtray-models.py            # process all
    python3 scripts/sandtray-models.py <id> ...   # process specific entries
    python3 scripts/sandtray-models.py --check    # dry-run, list entries
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

REPO_ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = REPO_ROOT / "scripts" / "sandtray-models.json"
OUT_DIR = REPO_ROOT / "public" / "sandtray" / "models"
LICENSE_PATH = OUT_DIR / "LICENSE.txt"
USER_AGENT = (
    "SandtrayModelFetcher/1.0 "
    "(https://github.com/sean/traumaSite; sean@thingvalla.tech) "
    "educational trauma-therapy reference"
)


def load_sources() -> tuple[dict, list[dict]]:
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data, data.get("models", [])


def download(url: str, dest: Path) -> None:
    req = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "model/gltf-binary, */*"})
    with urlopen(req, timeout=60) as resp:
        dest.write_bytes(resp.read())


def write_license(meta: dict) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    LICENSE_PATH.write_text(
        "Sandtray 3D models\n"
        "==================\n\n"
        f"License: {meta.get('license', 'CC0-1.0')}\n"
        f"Attribution: {meta.get('source_attribution', 'unknown')}\n\n"
        "No UI-level attribution is required by CC0, but we record it here\n"
        "so future contributors know where the models came from.\n"
    )


def process_one(entry: dict) -> tuple[bool, str]:
    fig_id = entry["id"]
    file_name = entry["file"]
    url = entry["url"]
    out_path = OUT_DIR / file_name
    if out_path.exists() and out_path.stat().st_size > 0:
        return True, f"{fig_id}: cached ({out_path.stat().st_size // 1024} KB)"
    try:
        download(url, out_path)
    except HTTPError as e:
        return False, f"{fig_id}: HTTP {e.code} for {url}"
    except URLError as e:
        return False, f"{fig_id}: download failed: {e.reason}"
    except Exception as e:
        return False, f"{fig_id}: error: {e}"
    size_kb = out_path.stat().st_size // 1024
    return True, f"{fig_id}: ok ({size_kb} KB)"


def emit_ts_snippet(entries: list[dict]) -> str:
    """TS snippet for entries whose GLBs actually landed."""
    lines = []
    for e in entries:
        out_path = OUT_DIR / e["file"]
        if not out_path.exists():
            continue
        lines.append("  {")
        lines.append(f"    id: {json.dumps(e['id'])},")
        lines.append(f"    modelPath: '/sandtray/models/{e['file']}',")
        lines.append(
            f"    alt: {{ en: {json.dumps(e['alt_en'])}, "
            f"es: {json.dumps(e['alt_es'])} }},"
        )
        lines.append(f"    category: {json.dumps(e['category'])},")
        lines.append(f"    defaultScale: {e.get('defaultScale', 1.0)},")
        lines.append(f"    source: 'KayKit by Kay Lousberg (CC0)',")
        lines.append("  },")
    return "\n".join(lines)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Fetch sandtray 3D models from CC0 sources.")
    parser.add_argument("ids", nargs="*", help="If given, only process these ids.")
    parser.add_argument("--check", action="store_true",
                        help="Dry run: list entries, do nothing.")
    args = parser.parse_args(argv[1:])

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    meta, sources = load_sources()
    if not sources:
        print(f"No models listed in {JSON_PATH}.")
        return 0

    write_license(meta)

    if args.check:
        for e in sources:
            print(f"  {e['id']:20s} [{e['category']:8s}] {e['alt_en']:15s} <- {e['url']}")
        print(f"\nTotal: {len(sources)} models listed.")
        return 0

    targets = sources
    if args.ids:
        targets = [e for e in sources if e["id"] in args.ids]
        if not targets:
            print(f"No matching ids: {args.ids}")
            return 1

    ok = 0
    fails = []
    for e in targets:
        success, msg = process_one(e)
        print(f"{'OK  ' if success else 'FAIL'}  {msg}")
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
