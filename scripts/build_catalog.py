#!/usr/bin/env python3
"""Build the searchable catalog from the maintained README and update metadata.

Uses only the Python standard library. No network requests or inferred publication
metadata: README dates retain month precision; vetted update dates retain their
recorded precision. Run with --check to detect a stale generated catalog.
"""

import argparse
from collections import Counter
from datetime import date
import hashlib
import html
import json
from pathlib import Path
import re
import unicodedata
from urllib.parse import urlsplit, urlunsplit


ROOT = Path(__file__).resolve().parents[1]
CATEGORIES = ["Dataset", "Model", "Harness", "Benchmark", "Survey"]
LINK = re.compile(r"\[([^\[\]]+)\]\((https?://[^\s)]+)\)")
ARXIV = re.compile(r"arxiv\.org/(?:abs|pdf|html)/(\d{4}\.\d{4,5})(?:v\d+)?")

# Editorial scope labels, not claims that these works demonstrate agent learning.
# Keep all historical entries and their original pillar labels. Generative-world
# work is contextual infrastructure for the player/environment research agenda.
SUPPORTING_ENVIRONMENTS = {
    "Matrix-Game 4.0: Harnessing Video Models for Real-Time Playable Game Worlds",
    "Matrix-Game 3.0: Real-Time and Streaming Interactive World Model with Long-Horizon Memory",
    "Matrix-game 2.0: An open-source real-time and streaming interactive world model",
    "Matrix-Game: Interactive World Foundation Model",
    "WorldCam: Interactive Autoregressive 3D Gaming Worlds with Camera Pose as a Unifying Geometric Representation",
    "Solaris: Building a Multiplayer Video World Model in Minecraft",
    "PAN: A World Model for General, Interactable, and Long-Horizon World Simulation",
    "MineWorld: a Real-Time and Open-Source Interactive World Model on Minecraft",
    "WHAMM! Real-time world modelling of interactive environments.",
    "Model as a Game: On Numerical and Spatial Consistency for Generative Games",
    "World and Human Action Models towards gameplay ideation",
    "GameFactory: Creating New Games with Generative Interactive Videos",
    "Playable Game Generation",
    "GameGen-X: Interactive Open-world Game Video Generation",
    "Diffusion Models Are Real-Time Game Engines",
    "Genie: Generative Interactive Environments",
    "GameDirector: Decoupling Gameplay Logic from Rendering for Player-Configurable Game World Models",
    "Agora-2: An Action-Conditioned World Model for Real-Time Multiplayer Environments",
    "Agora-1: The Multi-Agent World Model",
    "WorldMind: Decoupled Game World Model for State-Aware NPC Behavior",
    "StatePlay: State-Aware Game World Models for Mechanics-Consistent Generation",
    "SCOPE: Simulating Cross-game Operations in Playable Environments for FPS World Models",
    "ReactiveGWM: Flexible Control and NPC Reactivity in Game World Models",
    "Procedural Content Generation in Games: A Survey with Insights on Emerging LLM Integration",
}


def plain(value):
    return html.unescape(value.replace("**", "").replace("\\|", "|").strip())


def normalized_title(value):
    value = unicodedata.normalize("NFKD", plain(value)).casefold()
    return "".join(c for c in value if c.isalnum())


def canonical_url(value):
    match = ARXIV.search(value)
    if match:
        return "https://arxiv.org/abs/" + match.group(1)
    parts = urlsplit(value)
    return urlunsplit(("https", parts.netloc.lower(), parts.path.rstrip("/"), parts.query, ""))


def links_in(value):
    return [{"label": plain(label), "url": html.unescape(url)} for label, url in LINK.findall(value)]


def identities(row):
    keys = {"title:" + normalized_title(row["title"])}
    for link in row["links"]:
        if link["label"].lower() in {"paper", "publication", "report"}:
            keys.add("paper:" + canonical_url(link["url"]))
    return keys


def read_rows(text):
    rows = []
    section = None
    for line_no, line in enumerate(text.splitlines(), 1):
        if line.startswith("## "):
            section = next((s for s in CATEGORIES if re.search(r"\b" + s + r"$", line)), None)
        if not section:
            continue
        if line.startswith("|") and re.match(r"\|\s*\d{4}/\d{2}", line):
            cells = [c.strip() for c in re.split(r"(?<!\\)\|", line.strip().strip("|"))]
            if len(cells) != 5:
                raise ValueError(f"README.md:{line_no}: expected five table columns, got {len(cells)}")
            recorded_date, title, venue, keywords, link_cell = cells
        elif section == "Survey" and line.startswith("* `["):
            match = re.match(r"\* `\[(\d{4}/\d{2})\]` \*\*(.+?)\*\* \*([^*]+)\* (.+)$", line)
            if not match:
                raise ValueError(f"README.md:{line_no}: unsupported survey record")
            recorded_date, title, venue, link_cell = match.groups()
            keywords = ""
        else:
            continue
        links = links_in(link_cell)
        if not links:
            raise ValueError(f"README.md:{line_no}: record has no parsed links")
        rows.append({"section": section, "line": line_no, "date": recorded_date.replace("/", "-"),
                     "title": plain(title), "venue": plain(venue), "keywords": plain(keywords), "links": links})
    if set(r["section"] for r in rows) != set(CATEGORIES):
        raise ValueError("README must contain records for all four pillars and Survey")
    return rows


def group_rows(rows):
    """Union on canonical titles or paper identities, never on shared code URLs."""
    parents = list(range(len(rows)))

    def find(i):
        while parents[i] != i:
            parents[i] = parents[parents[i]]
            i = parents[i]
        return i

    seen = {}
    for i, row in enumerate(rows):
        for key in identities(row):
            if key in seen:
                parents[find(i)] = find(seen[key])
            seen[key] = i
    groups = {}
    for i, row in enumerate(rows):
        groups.setdefault(find(i), []).append(row)
    return list(groups.values())


def unique(values):
    return list(dict.fromkeys(values))


def merged_links(rows, extra):
    result, seen = [], set()
    for link in [link for row in rows for link in row["links"]] + extra:
        # Preserve different source URL forms (e.g. conference and arXiv) while
        # avoiding identical resource buttons repeated across pillar rows.
        key = canonical_url(link["url"])
        if key not in seen:
            result.append(link)
            seen.add(key)
    return result


def build(readme, update):
    rows = read_rows(readme)
    update_index = {}
    for i, item in enumerate(update["entries"]):
        row = {"title": item["title"], "links": ([{"label": "Paper", "url": item["paper_url"]}] if item.get("paper_url") else [])}
        for key in identities(row):
            if key in update_index and update_index[key] != i:
                raise ValueError("Duplicate update identity: " + key)
            update_index[key] = i
    matched = set()
    entries = []
    supporting = {normalized_title(t) for t in SUPPORTING_ENVIRONMENTS}
    for group in group_rows(rows):
        candidates = {update_index[key] for row in group for key in identities(row) if key in update_index}
        if len(candidates) > 1:
            raise ValueError("Multiple update records merged: " + group[0]["title"])
        item = update["entries"][next(iter(candidates))] if candidates else {}
        matched.update(candidates)
        categories = [c for c in CATEGORIES if any(r["section"] == c for r in group)]
        if item and set(categories) != set(item["categories"]):
            raise ValueError("README/update category disagreement: " + item["title"])
        title = item.get("title", group[0]["title"])
        recorded_date = item.get("date", min(r["date"] for r in group))
        precision = {4: "year", 7: "month", 10: "day"}.get(len(recorded_date))
        if precision is None:
            raise ValueError("Invalid date precision: " + recorded_date)
        date.fromisoformat(recorded_date + {"year": "-01-01", "month": "-01", "day": ""}[precision])
        extra = []
        for field, label in [("paper_url", "Paper"), ("project_url", "Project"), ("repository_url", "Repository")]:
            if item.get(field):
                extra.append({"label": label, "url": item[field]})
        for field, label in [("dataset_urls", "Data"), ("model_urls", "Models")]:
            extra.extend({"label": label if len(item[field]) == 1 else f"{label} {n + 1}", "url": url}
                         for n, url in enumerate(item.get(field, [])))
        links = merged_links(group, extra)
        arxiv_ids = sorted({m.group(1) for link in links if (m := ARXIV.search(link["url"]))})
        stable_id = "arxiv-" + arxiv_ids[0] if arxiv_ids else "work-" + hashlib.sha256(normalized_title(title).encode()).hexdigest()[:12]
        keywords_by_category = {c: "; ".join(unique(r["keywords"] for r in group if r["section"] == c and r["keywords"])) for c in categories}
        keywords = unique(k.strip() for value in keywords_by_category.values() for k in re.split(r",\s*", value) if k.strip())
        focus = "supporting environment" if normalized_title(title) in supporting else "survey" if categories == ["Survey"] else "player"
        entry = {
            "id": stable_id, "name": item.get("name", title.split(":", 1)[0]), "title": title,
            "date": recorded_date, "date_precision": precision,
            "date_basis": item.get("date_basis", "Month transcribed from the existing README; not independently reverified by this build."),
            "venue": item.get("venue_or_source_type", " / ".join(unique(r["venue"] for r in group))),
            "categories": categories, "primary_category": item.get("primary_category"),
            "keywords": keywords, "keywords_by_category": keywords_by_category, "links": links,
            "summary": item.get("summary"), "release_status": item.get("release_status"), "notes": item.get("notes"),
            "source": "update" if item else "baseline", "focus": focus,
            "source_rows": group, "sources": item.get("sources", unique(link["url"] for link in links)),
        }
        for field in ("paper_submission_date", "latest_revision_date"):
            if field in item:
                entry[field] = item[field]
        entry["search_text"] = " ".join([title, entry["name"], recorded_date, entry["venue"], *categories, *keywords,
                                           entry["summary"] or "", entry["notes"] or "", focus]).casefold()
        entries.append(entry)
    if matched != set(range(len(update["entries"]))):
        raise ValueError("Update entries missing from README: " + str(sorted(set(range(len(update["entries"]))) - matched)))
    entries.sort(key=lambda e: (e["date"], e["title"].casefold()), reverse=True)
    if len({e["id"] for e in entries}) != len(entries):
        raise ValueError("Duplicate generated entry IDs")
    if sum(len(e["source_rows"]) for e in entries) != len(rows):
        raise ValueError("Source rows were lost during deduplication")
    return {
        "schema_version": 1, "checked_through": update["checked_through"],
        "source_files": ["README.md", "data/literature-2026-10.json"],
        "date_note": "Baseline dates retain README month precision. Update dates and availability were checked through the stated cutoff. Building the website does not refresh those facts.",
        "focus_note": "Editorial browsing labels. Supporting environment preserves historical world-generation and simulation work as context; it does not assert demonstrated improvements to a game player.",
        "categories": CATEGORIES,
        "counts": {"works": len(entries), "source_rows": len(rows), "update_works": len(matched),
                   "by_category": {c: sum(c in e["categories"] for e in entries) for c in CATEGORIES},
                   "by_focus": dict(Counter(e["focus"] for e in entries)),
                   "baseline_works": sum(e["source"] == "baseline" for e in entries)},
        "entries": entries,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if docs/data/catalog.json is stale; do not write files.")
    args = parser.parse_args()
    catalog = build((ROOT / "README.md").read_text(), json.loads((ROOT / "data/literature-2026-10.json").read_text()))
    serialized = json.dumps(catalog, ensure_ascii=False, indent=2) + "\n"
    output = ROOT / "docs/data/catalog.json"
    if args.check:
        if not output.exists() or output.read_text() != serialized:
            parser.exit(1, "Catalog is stale. Run: python3 scripts/build_catalog.py\n")
    else:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(serialized)
    print(json.dumps(catalog["counts"], ensure_ascii=False))


if __name__ == "__main__":
    main()
