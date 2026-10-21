# Contributing

We welcome papers, released resources, factual corrections, and improvements to the project page. You can [suggest a paper](https://github.com/THUSI-Lab/Awesome-LFMs-Play-Games/issues/new?template=paper-suggestion.yml), [report a correction](https://github.com/THUSI-Lab/Awesome-LFMs-Play-Games/issues/new?template=correction.yml), or open a pull request.

## Research scope

Our focus is **foundation models as players, and game environments that help those players learn, adapt, and improve**. Relevant capabilities include perception, action, reasoning, memory, planning, social interaction, transfer, and continual learning.

We organize substantive contributions into four pillars:

| Pillar | What belongs here |
| --- | --- |
| Dataset | Gameplay observations, actions, trajectories, instructions, replays, and evaluation data; clearly labeled data-scaling studies. |
| Model | Learned policies, foundation-model adaptation, and action or world models used for decision-making. |
| Harness | Interfaces, control, planning, memory, tools, reflection, and adaptation around a model. |
| Benchmark | Evaluation environments, protocols, tasks, opponents, and metrics for player capabilities and improvement. |

Cross-list a work only when it contributes to each listed pillar. A model evaluated on a benchmark does not automatically introduce a new benchmark. A paper using a dataset does not automatically introduce a dataset.

Generated or simulated worlds are in scope when they provide a concrete training, interaction, planning, or evaluation environment for players. Explain the observation/action interface and how the player uses the environment. Pure asset production, cinematic game videos, and game-content generation without that connection are outside the main scope. Existing historical material is retained under the website's **supporting environment** label, without treating visual generation quality as evidence of player improvement.

Distinguish a policy that selects actions from a simulator that responds to them, recorded-video understanding from closed-loop play, and related non-foundation-model RL from foundation-model methods. Surveys are indexed separately as background reading.

## Adding or correcting a resource

1. Check the README and website catalog for the title, arXiv ID, and alternate names to avoid duplicates.
2. Use the paper, author project page, official repository, or official release report as evidence. Include direct links for claims about dates, results, or availability.
3. Add a row to every relevant README table, newest month first, using its existing columns:

   ```markdown
   | YYYY/MM | **Exact title** | Venue or source type | Specific contribution keywords | [[Paper](https://...)] [[Code](https://...)] |
   ```

4. For entries in the October update, keep `data/literature-2026-10.json` consistent with the README. Preserve the recorded date basis and precision; do not infer an exact day from an arXiv identifier. Paper dates and resource-release dates can differ.
5. Label availability precisely. A placeholder repository is a **Repository**, not released code. Separate code, model weights, data, and demos; state pending or partial releases. Keep any historical cutoff explicit when updating a release status.
6. Rebuild the generated catalog and include it in the same pull request:

   ```sh
   python3 scripts/build_catalog.py
   python3 scripts/build_catalog.py --check
   git diff --check
   ```

You can add a paper with only verified title, month, source type, keywords, and links. Missing authors, dates, summaries, or resource status should remain absent rather than guessed. Baseline metadata is transcribed from the README and is not silently reverified by the build.

## Project page and catalog

The static project page lives in `docs/`. Preview it locally from the repository root:

```sh
python3 -m http.server 8000 --directory docs
```

Open `http://localhost:8000/`. For interface changes, check desktop and narrow mobile layouts, keyboard navigation, search, category filters, empty results, and the browser console. Use relative asset paths so the page also works beneath the GitHub Pages repository path.

`scripts/build_catalog.py` uses only the Python standard library. It merges the README's four tables and Survey list by canonical paper identity or normalized title, retaining all original rows and cross-pillar labels. A shared code repository is **not** a deduplication key, because multiple papers may share one repository.

`docs/data/catalog.json` is generated; edit the source records, then rebuild. Each entry includes `categories`, searchable `keywords`, `links`, date precision and provenance, and `source_rows` pointing back to the README. `source` identifies the baseline or October update; `focus` is an editorial browsing label (`player`, `supporting environment`, or `survey`). The script's explicit supporting-environment title list can be updated when a scope label needs correction.

Please keep pull requests focused and describe the evidence for factual changes. Credit third-party visuals and respect their licenses. Do not include unpublished survey drafts, private reviews, credentials, or third-party assets without permission.
