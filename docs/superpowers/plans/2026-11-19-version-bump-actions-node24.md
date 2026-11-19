# Node 24 Actions And Version Bump Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the deprecated Node.js 20 action warnings and automatically apply the correct SemVer bump to release pull requests from `develop` to `main`.

**Architecture:** Keep the existing release-quality workflow as the single orchestration point. A focused release-version module will derive and apply an idempotent version update, while the workflow obtains trusted pull-request commit metadata and pushes only the resulting version files back to `develop`.

**Tech Stack:** GitHub Actions, `actions/checkout@v5`, `actions/upload-artifact@v5`, `actions/github-script@v9`, Node.js ESM, Vitest, Docker Compose.

**Spec:** Approved option 1 in the task discussion: no `CHANGELOG.md`; update `app/package.json`, `app/package-lock.json`, and `Dockerfile` only.

## Global Constraints

- Work only on the checked-out `develop` branch.
- Run package-manager commands and tests only through Docker Compose.
- Do not install dependencies.
- Do not commit or push without explicit authorization for the specific commit.
- Derive `major` from breaking commits, `minor` from `feat`, and `patch` from `fix` or `perf`; other commit types do not bump.
- Always calculate from the version on `origin/main`, making repeated workflow runs idempotent.
- Never interpolate untrusted commit messages or package contents into executable shell or JavaScript source.
- Do not create or maintain a changelog.

## Review Focus

- A breaking marker or `BREAKING CHANGE:` footer must outrank every lesser bump.
- A mixture of `feat`, `fix`, and non-release commits must resolve to `minor`.
- A pull request containing only non-release commit types must not modify or push version files.
- Malformed or missing base versions must fail closed without partially rewriting files.
- Re-running against already-correct version files must produce no changes and no commit.

---

### Task 1: Release version behavior

**Files:**
- Create: `app/scripts/release-version.js`
- Create: `app/tests/unit-node/release-version.test.js`

**Interfaces:**
- Produces: `deriveBump(commitMessages: string[]): "major" | "minor" | "patch" | null`
- Produces: `incrementVersion(version: string, bump: "major" | "minor" | "patch"): string`
- Produces: `updateReleaseVersion({ basePackagePath, packagePath, lockPath, dockerfilePath, commitMessagesPath }): { changed: boolean, version: string | null }`

- [ ] **Step 1: Write failing behavioral tests**

Cover bump precedence, non-release commits, strict `X.Y.Z` validation, coordinated updates to both package files and the Docker label, malformed-input failure without partial writes, and an idempotent second run.

- [ ] **Step 2: Run the focused test in the container and verify RED**

Run: `docker compose run --rm test npm test -- tests/unit-node/release-version.test.js`

Expected: FAIL because `release-version.js` does not exist.

- [ ] **Step 3: Implement the minimal release-version module**

Read all external values from files, validate before writing, derive the next version from the base package, and rewrite only the three approved version locations.

- [ ] **Step 4: Run the focused test in the container and verify GREEN**

Run: `docker compose run --rm test npm test -- tests/unit-node/release-version.test.js`

Expected: PASS.

- [ ] **Step 5: Prepare a commit only after explicit user authorization**

Stage only the module and its tests; use the repository's required English conventional-commit format.

### Task 2: Release workflow contract

**Files:**
- Modify: `.github/workflows/release-quality.yml`
- Modify: `app/scripts/validate-release-workflow.js`
- Modify: `app/tests/unit-node/release-workflow-contract.test.js`

**Interfaces:**
- Consumes: `updateReleaseVersion(...)` through the script CLI contract.
- Produces: a `version-bump` job restricted to same-repository `develop -> main` pull requests.

- [ ] **Step 1: Extend the contract test and verify RED**

Require the stable job set plus `version-bump`, Node 24-compatible action majors, least-privilege job permissions, checkout of the PR head, trusted commit-message file creation, base-version retrieval from `origin/main`, and conditional commit/push of only the approved files.

Run: `docker compose run --rm test npm test -- tests/unit-node/release-workflow-contract.test.js`

Expected: FAIL because the workflow still uses v4 actions and lacks `version-bump`.

- [ ] **Step 2: Update the validator for the new workflow contract**

Allow only `checkout@v5`, `upload-artifact@v5`, and `github-script@v9` in their intended jobs; keep sanitized artifact enforcement and add version-bump security invariants.

- [ ] **Step 3: Update the workflow**

Replace deprecated action majors and add the idempotent version-bump job with `contents: write` and `pull-requests: read`, operating only on `develop -> main` from the same repository.

- [ ] **Step 4: Run the focused contract test and verify GREEN**

Run: `docker compose run --rm test npm test -- tests/unit-node/release-workflow-contract.test.js`

Expected: PASS.

- [ ] **Step 5: Prepare a commit only after explicit user authorization**

Stage only the workflow, validator, and workflow contract test; use the repository's required English conventional-commit format.

### Task 3: Integrated validation

**Files:**
- Verify all files changed by Tasks 1 and 2.

**Interfaces:**
- Consumes: the release-version module and workflow contract.
- Produces: evidence that the complete existing unit suite accepts the change.

- [ ] **Step 1: Run the complete test suite once in the container**

Run: `docker compose run --rm test npm test`

Expected: all tests PASS with no warnings or failures introduced by the change.

- [ ] **Step 2: Review the final diff and repository state**

Confirm only approved files changed, no sensitive/local data appears, the branch remains `develop`, and no commit or push occurred without authorization.

- [ ] **Step 3: Request explicit authorization for the final commit**

Present the proposed commit title and body before executing `git commit`; request push authorization separately if needed.
