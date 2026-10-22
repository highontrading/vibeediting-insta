"""Find and download commercial-safe assets, logging every file's source and license.

Usage (npm run assets -- <command> ...):
  search <source> "<query>" [--n 8]            list candidates (no download)
  get <source> "<query>" --comp <Id> [--n 4]   download into public/assets/<Id>/ and append credits.json
  cutout <file.png|jpg> [--out <file.png>]     remove the background (rembg), writes a transparent PNG
Sources:
  nasa      NASA Image Library (public domain)
  met       The Met Open Access (CC0, public-domain objects only)
  loc       Library of Congress photos ("no known restrictions" only)
  archive   Internet Archive Prelinger collection video (public domain)
  openverse Openverse/Flickr images: CC0, public domain mark or CC BY only (credit the creator in the caption)
Never use Google Images, Pinterest or any other source without a clear commercial license.
"""
import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = "VibeEditing/1.0 (https://github.com/highontrading/vibeediting.app)"


def get_json(url: str, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            if attempt == 2:
                raise
            print(f"  retry ({e})", file=sys.stderr)
            time.sleep(3 * (attempt + 1))


def download(url: str, dest: Path):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as r, open(dest, "wb") as f:
        while chunk := r.read(1 << 16):
            f.write(chunk)


def q(s: str) -> str:
    return urllib.parse.quote(s)


def nasa(query, n):
    d = get_json(f"https://images-api.nasa.gov/search?q={q(query)}&media_type=image")
    out = []
    for item in d["collection"]["items"][: n * 2]:
        meta = item["data"][0]
        nid = meta["nasa_id"]
        out.append({
            "id": f"nasa-{nid}", "title": meta.get("title", ""), "source": "NASA Image Library",
            "page": f"https://images.nasa.gov/details/{q(nid)}", "license": "Public domain (NASA)",
            "url": f"https://images-assets.nasa.gov/image/{q(nid)}/{q(nid)}~large.jpg", "ext": "jpg",
        })
    return out[:n]


def met(query, n):
    d = get_json(f"https://collectionapi.metmuseum.org/public/collection/v1.1/search?q={q(query)}&hasImages=true&offset=0&limit=60")
    ids = d.get("objectIDs") or [r.get("objectID") for r in d.get("results", d.get("data", [])) if isinstance(r, dict)]
    out = []
    for oid in [i for i in ids if i][:60]:
        try:
            o = get_json(f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{oid}")
        except Exception:  # noqa: BLE001 — some search hits have no object record
            continue
        if o.get("isPublicDomain") and o.get("primaryImage"):
            out.append({
                "id": f"met-{oid}", "title": f"{o.get('title','')} — {o.get('artistDisplayName') or o.get('culture','')}".strip(" —"),
                "source": "The Metropolitan Museum of Art", "page": o.get("objectURL", ""), "license": "CC0 (Met Open Access)",
                "url": o["primaryImage"], "ext": "jpg",
            })
        if len(out) >= n:
            break
    return out


def loc(query, n):
    d = get_json(f"https://www.loc.gov/photos/?q={q(query)}&fo=json&c=60")
    out = []
    for r in d.get("results", []):
        item = r.get("item") if isinstance(r.get("item"), dict) else {}
        rights = f"{item.get('rights_advisory', '')} {item.get('rights_information', '')} {r.get('rights', '')}"
        if "no known restrictions" not in rights.lower():
            continue
        imgs = [u for u in r.get("image_url", []) if u.endswith(".jpg")]
        if not imgs:
            continue
        url = imgs[-1].split("#")[0]
        if url.startswith("//"):
            url = "https:" + url
        rid = re.sub(r"[^a-z0-9]+", "-", r.get("id", "")[-40:].lower()).strip("-")
        out.append({
            "id": f"loc-{rid}", "title": r.get("title", ""), "source": "Library of Congress", "page": r.get("id", ""),
            "license": "No known restrictions (Library of Congress)", "url": url, "ext": "jpg",
        })
        if len(out) >= n:
            break
    return out


def archive(query, n):
    params = f"q={q(query)}+AND+collection%3Aprelinger&fl%5B%5D=identifier&fl%5B%5D=title&rows={n * 2}&output=json"
    d = get_json(f"https://archive.org/advancedsearch.php?{params}")
    out = []
    for doc in d["response"]["docs"]:
        ident = doc["identifier"]
        files = get_json(f"https://archive.org/metadata/{ident}/files").get("result", [])
        mp4 = [f["name"] for f in files if f["name"].endswith(".mp4")]
        if not mp4:
            continue
        name = sorted(mp4, key=len)[0]
        out.append({
            "id": f"archive-{ident}", "title": doc.get("title", ""), "source": "Internet Archive — Prelinger Archives",
            "page": f"https://archive.org/details/{ident}", "license": "Public domain (Prelinger Archives)",
            "url": f"https://archive.org/download/{ident}/{q(name)}", "ext": "mp4",
        })
        if len(out) >= n:
            break
    return out


def openverse(query, n):
    d = get_json(f"https://api.openverse.org/v1/images/?q={q(query)}&license=by,cc0,pdm&page_size={n * 2}", timeout=90)
    out = []
    for r in d.get("results", []):
        ext = (r.get("filetype") or "jpg").lower()
        out.append({
            "id": f"ov-{r['id'][:8]}", "title": r.get("title", ""), "source": f"Openverse ({r.get('provider','')})",
            "page": r.get("foreign_landing_url", ""), "license": f"{r.get('license','').upper()} {r.get('license_version','')}".strip(),
            "creator": r.get("creator", ""), "attribution": r.get("attribution", ""), "url": r["url"], "ext": ext,
        })
        if len(out) >= n:
            break
    return out


SOURCES = {"nasa": nasa, "met": met, "loc": loc, "archive": archive, "openverse": openverse}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["search", "get", "cutout"])
    ap.add_argument("a")
    ap.add_argument("b", nargs="?")
    ap.add_argument("--n", type=int, default=4)
    ap.add_argument("--comp")
    ap.add_argument("--out")
    args = ap.parse_args()

    if args.cmd == "cutout":
        from rembg import new_session, remove  # heavy import, only when needed

        src = Path(args.a)
        dest = Path(args.out) if args.out else src.with_name(src.stem + "-cutout.png")
        session = new_session("isnet-general-use")  # ~170 MB, good on statues and objects
        dest.write_bytes(remove(src.read_bytes(), session=session, post_process_mask=True))
        print(f"cutout → {dest}")
        return

    items = SOURCES[args.a](args.b, args.n)
    if args.cmd == "search":
        for it in items:
            print(f"{it['id']:<34} {it['license']:<34} {it['title'][:70]}")
        return

    if not args.comp:
        sys.exit("--comp <CompositionId> is required for get")
    folder = ROOT / "public" / "assets" / args.comp
    folder.mkdir(parents=True, exist_ok=True)
    credits_path = folder / "credits.json"
    credits = json.loads(credits_path.read_text()) if credits_path.exists() else []
    for it in items:
        dest = folder / f"{it['id']}.{it['ext']}"
        if not dest.exists():
            try:
                download(it["url"], dest)
            except Exception as e:  # noqa: BLE001
                print(f"  skip {it['id']}: {e}", file=sys.stderr)
                continue
        if not any(c["file"] == dest.name for c in credits):
            credits.append({"file": dest.name, **{k: v for k, v in it.items() if k not in ("url", "ext")}})
        print(f"{dest.relative_to(ROOT)}  [{it['license']}]  {it['title'][:60]}")
    credits_path.write_text(json.dumps(credits, indent=1))


if __name__ == "__main__":
    main()
