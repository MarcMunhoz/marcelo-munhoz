# Testing Platform Group 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a documented legacy-test baseline, preserve migration ownership, and add the approved, pinned test dependencies through a container-only workflow.

**Architecture:** The existing Node test suite remains authoritative while the migration starts. Two OpenSpec artifacts capture the regression inventory and its future Vitest/component/Cypress owners. Exact package versions are declared in the application manifest and resolved by npm in a disposable Node container that bind-mounts only the application directory; it does not start the Compose service or load environment files.

**Tech Stack:** Node 22.22.2, Vue 3.5.38, Quasar 2.23.5, Vitest 4.1.11, Vue Test Utils 2.5.0, happy-dom 20.12.0, Cypress 15.21.1.

**Spec:** `openspec/changes/establish-comprehensive-testing-platform/{proposal.md,design.md,tasks.md}`

## Global Constraints

- Do not read `.env`, `.env.*`, credentials, tokens, or private keys.
- Install project packages only in a container and never start the existing Compose service, which currently declares an environment file.
- Retain `node --test` until the new platform reaches verified parity.
- Pin package and image versions; use `node:22.22.2-alpine` for Node jobs and `cypress/browsers:node-22.21.0-chrome-141.0.7390.107-1-ff-144.0-edge-141.0.3537.92-1` for future browser jobs.
- Do not commit without a separate, explicit confirmation.

---

### Task 1: Record the migration baseline and ownership matrix

**Files:**
- Create: `openspec/changes/establish-comprehensive-testing-platform/baseline.md`
- Create: `openspec/changes/establish-comprehensive-testing-platform/parity-matrix.md`
- Modify: `openspec/changes/establish-comprehensive-testing-platform/tasks.md`

- [ ] **Step 1: Inventory legacy guarantees without execution**

Run: `rtk find app/tests -maxdepth 1 -name '*.test.js' -type f`

Expected: exactly 20 legacy test files; helper files are excluded.

- [ ] **Step 2: Record counts, source-inspection classification, route and endpoint matrices**

Write the baseline with the 337-case total and explicitly distinguish executable contract checks from source-text assertions.

- [ ] **Step 3: Record target suite ownership for every legacy test file**

Write the mapping to `unit-node`, `unit-dom`, `component`, `integration`, `contract`, or `Cypress`, and identify assertions that become obsolete only after passing replacements exist.

- [ ] **Step 4: Mark OpenSpec tasks 1.1 and 1.2 complete**

Change only their checkboxes after both artifacts are complete.

### Task 2: Select and install the pinned test dependencies

**Files:**
- Create: `openspec/changes/establish-comprehensive-testing-platform/dependency-compatibility.md`
- Modify: `app/package.json`
- Modify: `app/package-lock.json`
- Modify: `openspec/changes/establish-comprehensive-testing-platform/tasks.md`

- [ ] **Step 1: Document compatibility evidence**

Record Node 22.22.2, Vue 3.5.38, Quasar 2.23.5, Vitest and V8 coverage 4.1.11, Vue Test Utils 2.5.0, happy-dom 20.12.0, Cypress 15.21.1, and the future pinned browser image with Chrome 141.0.7390.107-1 and Firefox 144.0.

- [ ] **Step 2: Declare exact development dependencies**

Add exact versions for `vitest`, `@vitest/coverage-v8`, `@vue/test-utils`, `happy-dom`, and `cypress` under `devDependencies` in `app/package.json`.

- [ ] **Step 3: Resolve the lockfile inside a disposable Node container**

Run: `docker run --rm --user "$(id -u):$(id -g)" -v "$PWD/app:/workspace" -w /workspace node:22.22.2-alpine npm install --package-lock-only --ignore-scripts`

Expected: `app/package-lock.json` resolves the exact declared package versions; no host package manager runs and no package lifecycle script or browser binary download occurs.

- [ ] **Step 4: Verify the resolved manifest inside the same container boundary**

Run: `docker run --rm -v "$PWD/app:/workspace:ro" -w /workspace node:22.22.2-alpine npm ci --ignore-scripts --dry-run`

Expected: npm accepts the manifest and lockfile without executing application lifecycle scripts.

- [ ] **Step 5: Mark OpenSpec tasks 1.3, 1.4, and 1.5 complete**

Task 1.3 is complete only with recorded explicit approval; task 1.5 is complete only after the container resolution and validation succeed.
