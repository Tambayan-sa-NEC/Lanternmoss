# Project question logging rule

| DATETIME | TASK TYPE | TODO ID | ACTION | BRANCH | REMARK | DURATION |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-21 19:21 | DOCS | TODO N/A | Updated the agent workflow for project questions | docs/question-log-exception | Question-only exchanges, including status and read-only advice, now create no branch or work log unless explicitly requested. Implementation and other repository changes keep their logging workflow. | 0h 01m |
| 2026-10-21 19:22 | TEST | TODO N/A | Reviewed the instruction diff | docs/question-log-exception | git diff --check passed; no runtime behavior changed, so project test suites were not run. | 0h 01m |
| 2026-10-21 19:22 | MERGE | TODO N/A | Merged and pushed workflow update | develop | No-ff merge 9266715 pushed to origin/develop; temporary docs branch deleted. | 0h 01m |
| 2026-10-21 19:22 | TOTAL | TODO N/A | Completed the question logging exception | develop | Future project questions do not enter work logs unless explicitly requested; repository work remains logged. | 0h 01m |
