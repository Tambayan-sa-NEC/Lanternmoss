# TODO 30i: organize validation reports

| DATETIME | TASK TYPE | TODO ID | ACTION | BRANCH | REMARK | DURATION |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-02 23:33 | CHORE | TODO 30i | Moved root report JSON into a dedicated folder | feat/todo-30i | Started at 23:26 on a clean stage and fast-forward checked `develop`. Moved all 35 JSON reports directly under `docs/` into `docs/reports/`; kept certification artifacts in `docs/releases/` and test fixtures in `tests/fixtures/`. Updated report-writer defaults, wiki links and file map. Historical work logs keep their original entries. | 0h 02m |
| 2026-11-02 23:33 | TEST | TODO 30i | Verified the report move | feat/todo-30i | Zero root-level `docs/*.json` remain, 35 report JSONs are present, and all referenced report links in the wiki resolve. Four changed scripts pass `node --check`; `npm test` passes 318/318 and `npm run sim` passes 71/71. `git diff --check` passes. No browser check applies to this file organization change. | 0h 04m |
| 2026-11-02 23:33 | CHORE | TODO 30i | Pushed the report-folder checkpoint | feat/todo-30i | Commit `1b13eef` is on `origin/feat/todo-30i`. The incomplete 30i stage remains out of its parent and `develop`; this path cleanup did not change the release flag or performance gate. | 0h 01m |
| 2026-11-02 23:33 | TOTAL | TODO 30i | Completed report-folder cleanup | feat/todo-30i | All root-level report JSONs have a dedicated folder and live links/writers point to it. The 30i hardware release acceptance remains open. | 0h 07m |
