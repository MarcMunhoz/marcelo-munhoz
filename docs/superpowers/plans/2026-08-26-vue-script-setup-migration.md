# Vue Script Setup Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert all 15 Vue single-file components from Options API or hybrid syntax to Composition API with `<script setup>` without changing behavior, templates, styles, routes, or component boundaries.

**Architecture:** Migrate components in five risk-ordered waves. Before each wave, remove test dependence on the Options object and add structural coverage for that wave; then translate instance state and APIs directly to Composition primitives while preserving asynchronous guards and cleanup.

**Tech Stack:** Vue 3.5, Quasar 2.27 with `@quasar/app-vite` 3.8, Vue Router 5, Node test runner, ESLint, Vite 8.

**Spec:** `openspec/changes/upgrade-major-tooling-dependencies/specs/major-dependency-upgrades/spec.md`

## Global Constraints

- Every Vue SFC uses `<script setup>` and contains no `defineComponent`, component mixin, Options declaration, or component-instance `this` access.
- Preserve templates, styles, public/admin behavior, metadata, route guards, request race protection, timers, listeners, callbacks, and cleanup.
- Do not split large components or perform broad composable extraction in this change.
- Extract only the minimum independently importable helper required to replace a mixin or an Options-coupled test.
- Never introduce `$q`; use imported Quasar APIs such as `Dialog` and `useMeta`.
- Run package operations, lint, tests, build, and runtime checks only inside the existing container.
- Do not install dependencies.
- Before every commit, stop and request explicit approval for that exact commit.

---

### Task 1: Lock the migration inventory and structural contract

**Files:**
- Create: `app/tests/compositionApiMigration.test.js`
- Modify: `openspec/changes/upgrade-major-tooling-dependencies/major-upgrade-report.md`
- Modify: `openspec/changes/upgrade-major-tooling-dependencies/tasks.md`

**Interfaces:**
- Consumes: the 15 SFC paths under `app/src`.
- Produces: `assertScriptSetupMigration(files)`, a test helper that checks each selected SFC for `<script setup>` and rejects `defineComponent`, `export default`, `mixins:`, `data()`, `methods:`, `computed:`, and `this.`.

- [ ] **Step 1: Add the structural test with the first-wave file list**

```js
const firstWave = [
  "../src/pages/ErrorNotFound.vue",
  "../src/pages/IndexPage.vue",
  "../src/pages/About.vue",
  "../src/components/AdminArticleCard.vue",
  "../src/components/BlogArchiveList.vue",
  "../src/components/BlogHighlights.vue",
];
```

Read each file relative to `import.meta.url`, assert `/<script setup>/`, and reject the forbidden structural patterns. Keep later waves in separate arrays so each wave can be activated immediately before its conversion.

- [ ] **Step 2: Run the new test and verify RED**

Run: `docker compose exec app node --test tests/compositionApiMigration.test.js`

Expected: FAIL because the first-wave files still use `defineComponent` or Options declarations.

- [ ] **Step 3: Record the component inventory and risk map**

Add all 15 SFCs, the five migration waves, mixins, watchers, route guards, template refs, and asynchronous request guards to `major-upgrade-report.md`; mark task 3.1 complete.

- [ ] **Step 4: Review the documentation diff**

Run: `git diff --check`

Expected: exit 0.

---

### Task 2: Convert simple and presentational components

**Files:**
- Modify: `app/src/pages/ErrorNotFound.vue`
- Modify: `app/src/pages/IndexPage.vue`
- Modify: `app/src/pages/About.vue`
- Modify: `app/src/components/AdminArticleCard.vue`
- Modify: `app/src/components/BlogArchiveList.vue`
- Modify: `app/src/components/BlogHighlights.vue`
- Modify: `app/tests/compositionApiMigration.test.js`
- Modify: `app/tests/blogFrontend.test.js`
- Modify: `app/tests/adminFrontend.test.js`
- Create: `app/src/utils/homeMedia.js`

**Interfaces:**
- Consumes: existing props, emits, templates, utility modules, and Cloudinary formatting behavior.
- Produces: six `<script setup>` components; optional named `cloudinaryImg` and `sortAnything` helpers in `homeMedia.js` if needed to replace the `About.vue` → `IndexPage.vue` mixin coupling.

- [ ] **Step 1: Adapt behavior tests before component conversion**

Move any behavior currently obtained by evaluating `export default defineComponent(...)` to an existing utility or the minimal `homeMedia.js` helper. Import the real named function in the test and keep literal expected outputs; do not recreate an Options object in tests.

- [ ] **Step 2: Verify adapted tests fail for the intended missing interface**

Run the affected `node --test` files in the container. Expected: FAIL only because the named helper or `<script setup>` structural requirement is not yet implemented.

- [ ] **Step 3: Convert the six SFC scripts**

Use direct top-level imports and declarations. Translate props to `defineProps`, events to `defineEmits`, computed state to `computed`, methods to local functions, and DOM lifecycle work to `onMounted` plus `onBeforeUnmount` cleanup. Remove the `About.vue` component mixins completely.

- [ ] **Step 4: Verify the wave**

Run, in order, inside the container: the affected tests, `npm run lint`, `npm test`, and `npm run build`.

Expected: all commands exit 0; structural test passes for all six files.

- [ ] **Step 5: Mark OpenSpec task 3.2 complete and pause for commit approval if a commit is desired**

---

### Task 3: Convert shell, identity, routing, and metadata components

**Files:**
- Modify: `app/src/App.vue`
- Modify: `app/src/layouts/MainLayout.vue`
- Modify: `app/src/pages/AuthorProfile.vue`
- Modify: `app/tests/compositionApiMigration.test.js`
- Modify: `app/tests/adminAccess.test.js`
- Modify: `app/tests/adminAuth.test.js`
- Modify: `app/tests/routingConfiguration.test.js`

**Interfaces:**
- Consumes: `useRoute`, `useRouter`, `useMeta`, Netlify Identity callbacks, cookie notice logic, and public author API helpers.
- Produces: reactive metadata through `useMeta(() => metadata)`, explicit router access, and cleanup for callbacks, timers, and listeners.

- [ ] **Step 1: Activate the three shell files in the structural test and verify RED**

Expected: failure on their current Options/hybrid scripts.

- [ ] **Step 2: Adapt tests away from `this.$route`, `this.$router`, mixin, and Options-object source expectations**

Retain assertions on route outcomes, cookie visibility, identity callback effects, metadata values, and cleanup behavior.

- [ ] **Step 3: Convert `App.vue`**

Replace the hybrid `setup` plus Options blocks with top-level refs/computed/watch. Replace the metadata mixin with reactive `useMeta`; preserve title and cookie-notice route reactions.

- [ ] **Step 4: Convert `MainLayout.vue`**

Use `useRoute`/`useRouter`, local functions, refs, computed values, and explicit unmount cleanup. Preserve three-click admin unlock, Identity login/logout callbacks, timers, responsive menu behavior, and navigation replacement semantics.

- [ ] **Step 5: Convert `AuthorProfile.vue`**

Use route composables, reactive request state, computed display values, and `useMeta`; preserve author loading, article links, empty/error states, and stale request protection.

- [ ] **Step 6: Verify the wave and smoke routes**

Run affected tests, lint, full tests, build, then fetch `/`, `/about`, `/blog/authors/example-author`, and `/admin` from port 1991 inside the container. Static route responses must return HTML; tests/build/lint must exit 0.

- [ ] **Step 7: Mark OpenSpec task 3.3 complete and pause for commit approval if a commit is desired**

---

### Task 4: Convert public asynchronous blog components

**Files:**
- Modify: `app/src/pages/Blog.vue`
- Modify: `app/src/components/BlogArticle.vue`
- Modify: `app/tests/compositionApiMigration.test.js`
- Modify: `app/tests/blogFrontend.test.js`
- Modify: `app/tests/blogArchive.test.js`
- Modify: `app/tests/blogNavigationRoundTrip.test.js`

**Interfaces:**
- Consumes: blog archive utilities, API URL helper, route/query state, responsive media observer, share APIs, and metadata.
- Produces: Composition-based archive and article flows with unchanged route/query contracts and request-ID stale-response guards.

- [ ] **Step 1: Activate both files in the structural test and verify RED**

- [ ] **Step 2: Replace Options-object execution in `blogFrontend.test.js`**

Import existing archive/date/navigation utilities directly. Where behavior is component-local and meaningful, extract only a pure named function with explicit arguments and literal expected results; keep DOM/template assertions only for visible contracts.

- [ ] **Step 3: Convert `Blog.vue`**

Preserve canonical query synchronization, debounced search, route watcher timing, request cancellation/IDs, pagination, archive filters, media-query subscription, initial load ordering, and unmount cleanup.

- [ ] **Step 4: Convert `BlogArticle.vue`**

Preserve slug watcher timing, both request-ID guards, rendered article content, previous/next navigation, social sharing, metadata reactivity, and error/not-found states.

- [ ] **Step 5: Verify the wave**

Run blog tests, structural test, lint, full tests, build, and smoke `/blog` plus a representative article SPA route inside the container. All commands must exit 0.

- [ ] **Step 6: Mark OpenSpec task 3.4 complete and pause for commit approval if a commit is desired**

---

### Task 5: Convert administrative list and profile components

**Files:**
- Modify: `app/src/pages/AdminTags.vue`
- Modify: `app/src/pages/AdminProfile.vue`
- Modify: `app/src/pages/Admin.vue`
- Modify: `app/tests/compositionApiMigration.test.js`
- Modify: `app/tests/adminFrontend.test.js`
- Modify: `app/tests/adminAuth.test.js`
- Modify: `app/tests/contentfulAdmin.test.js`

**Interfaces:**
- Consumes: admin session/API/dashboard/tag/profile utilities, imported native `Dialog`, Markdown rendering, and responsive media observer.
- Produces: Composition-based administrative screens with unchanged owner/writer authorization and API payloads.

- [ ] **Step 1: Activate the three files in the structural test and verify RED**

- [ ] **Step 2: Adapt admin tests to observable contracts**

Remove assertions that require `this.session`, `this.$router`, Options method indentation, or method-object signatures. Retain literal assertions for authorization, endpoint payloads, native dialog outcomes, redirects, filtered rows, and form state.

- [ ] **Step 3: Convert `AdminTags.vue`**

Use refs/computed/local functions and imported `Dialog`; preserve session loading, owner enforcement, tag loading/creation/deletion, feedback, and single native confirmation.

- [ ] **Step 4: Convert `AdminProfile.vue`**

Preserve props/form initialization, 11 computed values, both field watchers, Markdown preview, image handling, authorization, save state, validation, and template refs.

- [ ] **Step 5: Convert `Admin.vue`**

Preserve session transitions, dashboard loading, filters, article actions, owner/writer permissions, media observer, timer cleanup, dialog confirmation, and navigation behavior.

- [ ] **Step 6: Verify the wave**

Run admin tests, structural test, lint, full tests, build, and smoke `/admin`, `/admin/tags`, and `/admin/profile` inside the container. All commands must exit 0.

- [ ] **Step 7: Mark OpenSpec task 3.5 complete and pause for commit approval if a commit is desired**

---

### Task 6: Convert the administrative article editor in isolation

**Files:**
- Modify: `app/src/pages/AdminArticleEditor.vue`
- Modify: `app/tests/compositionApiMigration.test.js`
- Modify: `app/tests/adminFrontend.test.js`
- Modify: `app/tests/cloudinaryMedia.test.js`
- Modify: `app/tests/contentfulManagementFacade.test.js`

**Interfaces:**
- Consumes: route/router composables, `onBeforeRouteLeave`, admin session/API helpers, Cloudinary editor and upload flows, tag helpers, imported `Dialog`, FileReader, template refs, and `nextTick`.
- Produces: a `<script setup>` editor with unchanged article payload, workflow transitions, unsaved-change guard, tag synchronization, media behavior, and owner/writer permissions.

- [ ] **Step 1: Activate `AdminArticleEditor.vue` in the structural test and verify RED**

- [ ] **Step 2: Adapt editor tests before conversion**

Retain observable assertions for payload construction, workflow endpoints, terminal redirects, failed-operation behavior, unsaved-change confirmation, media insertion, and tags. Remove Options-object and `this` source-shape assumptions.

- [ ] **Step 3: Translate editor state and computed values**

Use top-level refs/reactive state and computed values while preserving initialization and dirty-state comparison semantics.

- [ ] **Step 4: Translate editor operations**

Convert methods to local functions without changing payload construction, async ordering, error/feedback state, Contentful operations, Cloudinary upload/editor callbacks, tag synchronization, or terminal redirects.

- [ ] **Step 5: Translate refs and navigation protection**

Replace `$refs` with template refs, `$nextTick` with imported `nextTick`, and `beforeRouteLeave` with `onBeforeRouteLeave`. Preserve the exact condition and native dialog result governing navigation.

- [ ] **Step 6: Verify the editor wave**

Run editor/admin/media tests, structural test, lint, full tests, build, and smoke both new and edit editor routes inside the container. All commands must exit 0.

- [ ] **Step 7: Mark OpenSpec task 3.6 complete and pause for commit approval if a commit is desired**

---

### Task 7: Complete Composition API validation and reporting

**Files:**
- Modify: `app/tests/compositionApiMigration.test.js`
- Modify: `openspec/changes/upgrade-major-tooling-dependencies/major-upgrade-report.md`
- Modify: `openspec/changes/upgrade-major-tooling-dependencies/tasks.md`

**Interfaces:**
- Consumes: all 15 migrated SFCs and the existing container workflow.
- Produces: final structural and behavioral evidence for OpenSpec task 3.7.

- [ ] **Step 1: Confirm the structural test covers all 15 SFCs**

Run: `docker compose exec app node --test tests/compositionApiMigration.test.js`

Expected: all 15 files pass `<script setup>` and forbidden-pattern checks.

- [ ] **Step 2: Search independently for remnants**

Run `rg` over `app/src/**/*.vue` for `defineComponent`, `export default`, `mixins:`, `data()`, `methods:`, `computed:`, and `this.`. Expected: no matches in SFC script blocks.

- [ ] **Step 3: Run final container validation**

Run separately: `npm run lint`, `npm test`, and `npm run build` through `docker compose exec app`. Expected: lint exit 0, complete test suite with zero failures, and successful SPA build.

- [ ] **Step 4: Run runtime smoke checks**

Fetch `/`, `/about`, `/blog`, `/admin`, `/admin/tags`, `/admin/profile`, and both editor route shapes from port 1991 inside the container. Expected: SPA HTML response for every registered route.

- [ ] **Step 5: Update the migration report and OpenSpec progress**

Record all 15 converted files, test totals, lint/build results, route smoke results, and the explicit deferral of component decomposition/composable architecture. Mark task 3.7 complete.

- [ ] **Step 6: Review the complete diff**

Run: `git diff --check`, `git status --short`, and a scoped `git diff`. Confirm no generated files or unrelated changes are present.

- [ ] **Step 7: Stop and request explicit approval for the exact detailed commit**

Do not add, commit, merge, or push until the user approves that specific commit.
