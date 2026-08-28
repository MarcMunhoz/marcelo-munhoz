## Context

The application currently uses Quasar CLI/Vite v2, Quasar extras v1, Vue Router v4, ESLint 9 with Vue ESLint 9, and Tailwind CSS 3. The previous CVE pass deliberately deferred these majors. Quasar CLI v3 requires Router v5 and may require import/alias changes; Tailwind 4 changes the PostCSS integration and raises the browser baseline; ESLint 10 has breaking configuration and rule API changes.

## Goals / Non-Goals

**Goals:**

- Upgrade the major lines in isolated, reviewable groups.
- Standardize all Vue single-file components on Composition API with `<script setup>`.
- Preserve public routes, admin workflows, build output, and supported runtime behavior.
- Make browser-support consequences explicit before accepting Tailwind 4.
- Keep all package operations and validation inside the container.

**Non-Goals:**

- Replacing Vue or Quasar.
- Introducing unrelated feature work.
- Splitting large components or performing a broad composable extraction; that architecture work is deferred to a future change.
- Silently dropping legacy browser support or forcing incompatible upgrades.

## Decisions

- Upgrade Router 5 alongside `@quasar/app-vite` 3 because the Quasar migration requires it.
- Treat Tailwind 4 as a separate risk boundary within the change: migrate PostCSS/configuration, inspect utility output, and require an explicit browser-support decision.
- Upgrade ESLint and its Vue plugin together, retaining flat config and fixing only reported compatibility issues.
- Upgrade `@quasar/extras` with the Quasar group and verify icon/font asset paths in a production build.
- Convert all 15 Vue SFCs to `<script setup>` in incremental waves before changing lint or styling tooling.
- Preserve templates, styles, component boundaries, and runtime behavior; extract only the minimum shared utility required to replace component mixins or structurally coupled tests.
- Replace Options APIs with direct Composition APIs: `defineProps`, `defineEmits`, refs/reactive state, computed values, watchers, lifecycle hooks, router composables, template refs, and Quasar `useMeta`.
- Remove mixins and all component-instance `this` access; reusable logic SHALL use explicit functions rather than component inheritance.
- Modernize tests that execute or inspect Options API objects so they verify behavior or independently importable functions instead.
- Use incremental lockfile updates and run validation after each group, rather than one forced all-at-once update.

## Risks / Trade-offs

- **[Quasar v3 changes aliases or config APIs]** → Follow the official migration guide, search all imports, and run build/router tests.
- **[Tailwind v4 breaks styling or old browsers]** → Use the official upgrade path, compare representative pages, and defer or document the migration if browser requirements cannot change.
- **[ESLint 10 exposes new errors]** → Fix real incompatibilities, avoid broad rule suppression, and keep the lint baseline reviewable.
- **[Major groups interact]** → Keep commits/groups logically separated and validate after each group.
- **[Composition conversion changes reactive timing or cleanup]** → Preserve watcher options, request guards, route guards, event listeners, timers, and unmount cleanup one component at a time.
- **[Existing tests are coupled to Options API structure]** → Adapt tests before each migration wave and retain template-contract checks only where they represent user-visible behavior.
- **[Large admin components hide regressions]** → Convert administrative screens last, with `AdminArticleEditor.vue` isolated in its own wave.

## Migration Plan

1. Capture current dependency, browser-target, lint, test, and build baselines in the container.
2. Upgrade Quasar CLI/extras and Router together; fix and validate integration.
3. Convert Vue components to `<script setup>` in waves: simple components, shell/SEO, public blog, admin, and finally the article editor.
4. Upgrade ESLint packages; fix flat-config/plugin compatibility and validate lint.
5. Migrate Tailwind/PostCSS and review browser support and visual output.
6. Run clean install, audit, tests, lint, build, runtime smoke, and browser checks.
7. Document deferred or reverted majors with evidence.

Rollback is a Git revert of the dependency/configuration/source changes.

## Open Questions

- Is the project willing to raise its supported browser baseline to Tailwind 4's documented minimum?
- Should any major group be split into its own follow-up change if visual or framework migration scope expands?
- Which large components should be decomposed into smaller components or composables in a future architecture change?
