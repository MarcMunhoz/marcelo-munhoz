# Test Platform Dependency Compatibility

Selected 2026-09-01 before the Group 1 installation.

| Component | Pinned version | Compatibility rationale |
| --- | --- | --- |
| Node test image | `node:22.22.2-alpine` | Satisfies the current Node engine floor and Cypress transitive engine requirements, and is supported by Vitest 4.1.11 and Cypress 15.21.1. |
| Vue | `3.5.38` | Existing application dependency; satisfies Vue Test Utils 2.5.0's Vue 3 peer range. |
| Quasar | `2.23.5` | Existing Vue 3 application dependency; component harness work follows in Group 3. |
| Vitest | `4.1.11` | Supports Node 20, 22, and 24 lines. |
| V8 coverage provider | `4.1.11` | Exact peer match with Vitest 4.1.11. |
| Vue Test Utils | `2.5.0` | Supports Vue 3 and provides component mounting primitives. |
| DOM environment | `happy-dom@20.12.0` | Supports Node 20 and newer for the forthcoming isolated DOM project. |
| Cypress | `15.21.1` | Supports Node 20, 22, and 24 lines. |
| Browser image | `cypress/browsers:node-22.21.0-chrome-141.0.7390.107-1-ff-144.0-edge-141.0.3537.92-1` | Exact Node 22 / Chrome 141 / Firefox 144 image for future browser profiles; no host browser dependency. |

The current group adds only the npm development dependencies. Browser-image use and test-container profiles belong to Group 2. Package resolution must run in a disposable Node container with lifecycle scripts disabled; Cypress browser binary download is deferred until the dedicated browser profile is implemented.
