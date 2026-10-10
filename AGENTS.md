# Project work logs

Record every meaningful task, decision, change, and verification in a Markdown file under `docs/logs/`.
Use a Markdown table with one entry per row, keeping these six columns in this order:

| DATETIME | TASK TYPE | TODO ID | ACTION | BRANCH | REMARK |
| --- | --- | --- | --- | --- | --- |
| 2026-10-09T16:45:22+08:00 | TASK | TODO 19 | Describe the action | feat/todo-19-save-load | Record the outcome or limitation |

Use an ISO 8601 datetime with timezone, `DECISION` or `TASK`, the applicable TODO number
(or `TODO N/A` for work outside the roadmap), and the current branch name. Record outcomes and limitations truthfully.
Append new rows to the table. Escape literal pipes as `\|` and use `<br>` for line breaks inside cells.
Preserve existing entries when changing the log format.

# Feature completion workflow

Implement every TODO or feature on a feature branch, never directly on `master` or `main`.
After completing a TODO or feature:

1. Bring the feature branch up to date with the repository's default branch (`master` or `main`) and resolve conflicts.
2. Run all project tests, including `npm test` and `npm run sim`, plus any required feature-specific or browser checks.
   All checks must pass before merging. Fix failures and rerun the affected checks; do not merge or delete the branch while any check fails.
3. Commit the completed changes and merge the tested feature branch into the default branch.
   If conflict resolution or additional edits change the tested code, rerun the tests before completing the merge.
4. Push the merged default branch when a remote is configured. Confirm the feature branch's work is included in it,
   then delete the feature branch locally and remotely if it exists there. Never delete `master` or `main`.
5. Record test results, the merge, push, and branch deletion in `docs/logs/` using the table format above.

This is the standing completion workflow; no additional confirmation is needed for these steps.
