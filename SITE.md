# Project page maintenance

The public project page is hosted at <https://thusi-lab.github.io/Awesome-LFMs-Play-Games/>. It is a buildless static site: HTML, CSS, JavaScript modules, and local assets. No runtime dependencies, API keys, or model calls are needed.

## Edit and preview

```sh
python3 scripts/build_catalog.py
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs
```

Open <http://127.0.0.1:8765/>. Use an HTTP server rather than opening the HTML file directly, because the page loads JSON and JavaScript modules.

`README.md` is the canonical reading list. `data/literature-2026-10.json` supplies the verified October metadata. `scripts/build_catalog.py` merges and deduplicates them into `docs/data/catalog.json`. Regenerate this file after editing the list, including edits that change source line numbers. The website identifies supporting environment work without removing it from the collection.

The prose and interactions live in `docs/index.html`, `docs/app.js`, and `docs/styles.css`. The transfer lab is an independent scripted illustration in `docs/transfer-lab.js` and `docs/transfer-lab.css`. `docs/data/survey.bib` contains the public preprint citation. Original artwork and its prompt are documented in `docs/assets/README.md`.

## Check before publishing

```sh
python3 scripts/build_catalog.py --check
node --test tests/*.test.mjs
git diff --check
```

Tests require Node.js 22 or later; no package installation is necessary. Check the page at desktop and mobile widths, including chapter navigation, pillar links, combined literature filters, empty results, pagination, citation copying, and each transfer-lab scenario. The lab reports scripted behavior, never foundation-model benchmark results.

## GitHub Pages

In the repository's **Settings → Pages**, the publishing source is **Deploy from a branch**, branch **main**, folder **/docs**. `.nojekyll` keeps the site static. A change merged into `main` triggers the Pages build. Keep relative asset paths so the project also works below the repository's URL prefix. When changing the page structure, CSS, or entry script, update the asset version query in `index.html` and `credits.html` together so returning browsers do not combine new HTML with cached, incompatible assets.

The manuscript and the living collection have different cutoffs. The site uses the revised survey title; citation metadata follows the publicly available arXiv version. Do not add an acceptance badge until a publication decision is verified.
