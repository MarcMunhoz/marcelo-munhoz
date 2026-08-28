## 1. Baseline

- [x] 1.1 Capture current manifests, runtime, browser targets, lint, tests, and build results inside the container.
- [x] 1.2 Confirm the migration order and record the current major versions and peer constraints.

## 2. Quasar And Router

- [x] 2.1 Upgrade `@quasar/app-vite` to v3, `@quasar/extras` to v2 where compatible, and Vue Router to v5 inside the container.
- [x] 2.2 Update Quasar aliases/imports/configuration and resolve router or icon asset compatibility issues.
- [x] 2.3 Validate public/admin routes, lint, tests, and production build after the Quasar group.

## 3. Vue Composition API

- [x] 3.1 Record the 15-SFC inventory and map Options-coupled tests, shared mixins, watchers, lifecycle cleanup, router access, template refs, metadata, and request guards.
- [x] 3.2 Adapt affected tests and convert simple or presentational SFCs to `<script setup>`: `ErrorNotFound`, `IndexPage`, `About`, `AdminArticleCard`, `BlogArchiveList`, and `BlogHighlights`.
- [x] 3.3 Convert shell and metadata SFCs to `<script setup>`: `App`, `MainLayout`, and `AuthorProfile`, preserving router, identity callbacks, SEO, timers, listeners, and cleanup.
- [x] 3.4 Convert public asynchronous SFCs to `<script setup>`: `Blog` and `BlogArticle`, preserving query synchronization, request race guards, pagination, sharing, metadata, and responsive behavior.
- [x] 3.5 Convert administrative SFCs to `<script setup>`: `AdminTags`, `AdminProfile`, and `Admin`, preserving sessions, authorization, native dialogs, forms, timers, and responsive behavior.
- [x] 3.6 Convert `AdminArticleEditor` to `<script setup>` in isolation, preserving props/state, Contentful and Cloudinary workflows, tags, template refs, `nextTick`, unsaved-change detection, and the route-leave guard.
- [x] 3.7 Verify all 15 SFCs contain `<script setup>` and no Options API remnants; run targeted tests per wave plus final lint, complete tests, production build, and public/admin route smoke checks in the container; document results.

## 4. ESLint Tooling

- [x] 4.1 Upgrade ESLint and `eslint-plugin-vue` to v10-compatible releases.
- [x] 4.2 Resolve flat-config, rule, parser, or plugin compatibility issues without broad suppressions.
- [x] 4.3 Run lint and the complete test suite after the ESLint group.

## 5. Tailwind CSS

- [x] 5.1 Review and decide whether the Tailwind v4 browser baseline is acceptable for this project.
- [x] 5.2 If accepted, migrate Tailwind/PostCSS integration and configuration using the v4-compatible plugin path.
- [x] 5.3 Compare representative public/admin layouts and document any browser-support or styling changes.

## 6. Final Validation

- [x] 6.1 Run clean container install and verify lockfile consistency and npm audit results.
- [x] 6.2 Run lint, all tests, production build, and runtime startup in the container.
- [x] 6.3 Review the final diff and document upgraded, deferred, and reverted majors with evidence.
