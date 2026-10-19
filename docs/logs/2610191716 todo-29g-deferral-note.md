# TODO 29: recording the 29g deferral in the roadmap

A short documentation task at the owner's request: say in `TODO.md` why the cave TODO was merged with its last
stage outstanding, and what that does and does not commit the project to.

| DATETIME | TASK TYPE | TODO ID | ACTION | BRANCH | REMARK | DURATION |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-19 17:16 | DOCS | TODO 29 | Add the deferral note under the stage table | docs/todo-29g-deferral | Records that 29a-29f were merged on the owner's decision; that 29g waits on 27h (a recorded performance no-go) and 30i (not built); that the parent was deleted and 29g takes a fresh parent from `develop`; that 29f put caves into already-released worlds, so the next release would ship them and still needs confirmation; and that cave frame timing is measured but not certified. | 0h 04m |
| 2026-10-19 17:17 | REVIEW | TODO 29 | Follow the existing convention for naming a log from the docs | docs/todo-29g-deferral | First wrote a Markdown link with the log's space URL-encoded as `%20`. No other document links to a log file that way; every reference names `docs/logs/` in backticks. Replaced the link with the backticked file name so the note matches the rest of the documentation. | 0h 01m |
| 2026-10-19 17:17 | TEST | TODO 29 | Check before merging | docs/todo-29g-deferral | 263 unit tests pass. The simulations and browser checks were not rerun: the change touches `TODO.md` only, and the source is byte-identical to the commit on which all 56 simulations and all 22 browser checks passed an hour earlier. | 0h 01m |
| 2026-10-19 17:17 | MERGE | TODO 29 | Merge into `develop` and publish | develop | `--no-ff` merge dc32cfe, pushed, and `docs/todo-29g-deferral` deleted locally; it was never pushed, so there was no remote branch to delete. | 0h 01m |
| 2026-10-19 17:17 | TOTAL | TODO 29 | Recording the 29g deferral | develop | The roadmap now states why the cave TODO merged incomplete and what still gates its last stage and the public release. | 0h 05m |
