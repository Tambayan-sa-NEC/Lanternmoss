# TODO 27 release validation

| DATETIME | TASK TYPE | TODO ID | ACTION | BRANCH | REMARK | DURATION |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-21 19:25 | PLAN | TODO 27 | Started a fresh release-gate review from current develop | feat/todo-27-release-validation | Acer RTX 4050 and Edge available on AC power; Tidewhisper remains released: false. Validate the current otter-inclusive candidate before further features. | 0h 01m |
| 2026-10-21 19:43 | TEST | TODO 27 | Ran functional, balance and browser gates | feat/todo-27-release-validation | npm test 278/278; npm run sim 62/62; three-hero seed-1/7 balance 0/18 checked rows outside bands. Eleven Tidewhisper and catalog browser scripts passed; coastal enemies and Ironclaw each first had a staged bolt miss, then passed twice after their smoke setup was stabilized. Screenshot retakes were restored. | 0h 18m |
| 2026-10-21 19:43 | FIX | TODO 27 | Stabilized two combat smoke setups | feat/todo-27-release-validation | Held Shellback's facing for front/back shots; gave Ironclaw shots a still target, full casting resource and enough projectile frames. The checks continue using actual Z input and damage assertions. | 0h 01m |
