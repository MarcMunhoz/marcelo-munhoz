## Baseline

- Runtime: Node `v22.22.3`.
- Installed framework group: `quasar@2.27.0`, `@quasar/app-vite@2.6.2`, `@quasar/extras@1.18.0`, `vue@3.5.41`, and `vue-router@4.6.4`.
- Declared browser targets: ES2019, Edge 88, Firefox 78, Chrome 87, and Safari 13.1.
- Baseline lint: passes.
- Baseline tests: 308/308 pass.
- Baseline production build: passes with Quasar CLI/Vite 2.6.2.

## Migration Order And Constraints

1. Upgrade `@quasar/app-vite` to v3, `@quasar/extras` to v2, and Vue Router to v5 as one compatibility group.
2. Upgrade ESLint and the Vue ESLint plugin as a separate group.
3. Review the browser baseline before any Tailwind CSS v4 migration.

`@quasar/app-vite@3.8.1` requires Node `^22.22.0` or a newer supported even release, Quasar `^2.24.0`, Vue `^3.2.29`, and Vue Router `>=5`. The current Node, Quasar, and Vue versions satisfy those constraints; Router must move to v5 with the CLI upgrade.

## Quasar And Router Group

- Installed: `@quasar/app-vite@3.8.1`, `@quasar/extras@2.0.4`, `vue-router@5.2.0`, and the CLI-managed `vite@8.2.2`.
- Replaced Quasar v2 wrapper imports with the v3 `#q-app` API and migrated router environment access to the injected `import.meta.env.QUASAR_*` values.
- Replaced removed Quasar source aliases with the supported `@/` alias.
- Migrated the configured icon asset from Font Awesome 6 to Font Awesome 7, the version shipped by `@quasar/extras` v2.
- Kept the pure scroll behavior independently testable without importing the CLI-only `#q-app` alias in Node.
- Validation: public `/`, `/blog`, and protected `/admin` entry routes return HTML successfully; lint passes; all 308 tests pass; and the production SPA build passes with the declared browser targets.

## Composition API Migration Inventory And Structural Contract

The migration covers the 15 Vue SFCs below. Conversion stays in five waves so a structural gate and targeted behavioral tests can be activated immediately before each change. The gate is `app/tests/compositionApiMigration.test.js`: `assertScriptSetupMigration(files)` reads SFCs relative to `import.meta.url`, requires `<script setup>`, and rejects `defineComponent`, `export default`, `mixins:`, `data()`, `methods:`, `computed:`, and component-instance `this.` access.

| Wave | SFCs | Existing behavior and migration risks |
| --- | --- | --- |
| 1 — simple/presentational | `pages/ErrorNotFound.vue`, `pages/IndexPage.vue`, `pages/About.vue`, `components/AdminArticleCard.vue`, `components/BlogArchiveList.vue`, `components/BlogHighlights.vue` | `ErrorNotFound` only supplies component metadata. `IndexPage` owns static lists plus image, elapsed-year, and sorting helpers. `About` incorrectly inherits the Index component through `cloudinaryImg` and `sortAnything` mixins and attaches hover listeners on mount; replace that inheritance with explicit imports/functions while keeping the social ordering and hover behavior. `AdminArticleCard` exposes props/emits and lifecycle action helpers. Archive and highlights consume article formatting/navigation helpers; highlights derives primary and secondary items from props. No route guards, template refs, or request-race guards occur in this wave. |
| 2 — shell and metadata | `App.vue`, `layouts/MainLayout.vue`, `pages/AuthorProfile.vue` | `App` combines `setup()` with `createMetaMixin`, route-keyed rendering, an immediate `$route` watcher for title, and cookie-notice state. It must use `useMeta`, `useRoute`, and explicit watchers while retaining admin `noindex`. `MainLayout` loads the admin session/profile, binds Netlify Identity callbacks, uses router/route access, and clears navigation/feedback timers in `beforeUnmount`. `AuthorProfile` combines Cloudinary and metadata mixins with a route-slug fetch and SEO data; preserve its loading/error states and metadata. |
| 3 — public asynchronous | `pages/Blog.vue`, `components/BlogArticle.vue` | `Blog` canonicalizes and watches route query state, debounces search, synchronizes router history, clears its timer, and increments `archiveRequestId` to reject stale archive/highlight responses. `BlogArticle` watches the route slug, generates metadata, renders article content, and independently guards article and neighbor-navigation fetches with `articleRequestId` and `navigationRequestId`; stale results must not replace a newer slug. |
| 4 — administrative | `pages/AdminTags.vue`, `pages/AdminProfile.vue`, `pages/Admin.vue` | `AdminTags` resolves the session on mount and redirects non-owners. `AdminProfile` binds Identity login callbacks, redirects signed-out visitors, watches profile photo inputs to reset their index, and uses the `bioEditor` template ref. `Admin` binds Identity callbacks, redirects signed-out visitors, loads dashboard data, manages mutation feedback timers, and disposes its compact-grid media-query observer. Preserve authorization, dialogs/forms, responsive state, and cleanup. |
| 5 — isolated editor | `pages/AdminArticleEditor.vue` | `AdminArticleEditor` owns session/authorization, Contentful tag/article operations, Cloudinary upload/editing, markdown preview/selection, `bodyEditor` and dynamic field template refs, `nextTick` focus/selection work, native unsaved-change confirmation, and `beforeRouteLeave`. Preserve the sign-out exception in the leave guard, form snapshots, async action states, and error/feedback behavior. |

### Shared mixins and explicit replacements

- `About.vue` inherits `cloudinaryImg` and `sortAnything` from `IndexPage.vue`; turn each into an independently imported function/data dependency rather than component inheritance.
- `App.vue`, `AuthorProfile.vue`, and `BlogArticle.vue` use Quasar's `createMetaMixin`; replace it with explicit Composition API metadata while keeping dynamic route/article values.
- No other SFC declares a component mixin. The migration must not add new mixins.

### Watchers, guards, refs, and cleanup map

- Watchers: `App.vue` watches `$route` immediately; `Blog.vue` watches `$route.query`; `BlogArticle.vue` watches `$route.params.slug`; `AdminProfile.vue` watches `gravatarProfile` and `fallbackPhotoUrl` to reset the photo index.
- Route guards: `AdminArticleEditor.vue` has `beforeRouteLeave`; it permits admin sign-out navigation and otherwise confirms unsaved changes before continuing.
- Template refs: `AdminProfile.vue` has `bioEditor`; `AdminArticleEditor.vue` has `bodyEditor` and resolves dynamic `${field}Editor` refs for markdown insertion and focus restoration.
- Cleanup: `MainLayout.vue` clears two timers; `Blog.vue` clears the search timer and invalidates outstanding archive requests; `Admin.vue` clears feedback timing and stops its media-query observer. `About.vue` currently registers direct hover listeners, so its behavior must be retained and cleanup considered during conversion.
- Async request guards: `Blog.vue` uses `archiveRequestId`; `BlogArticle.vue` uses both `articleRequestId` and `navigationRequestId`, additionally comparing the requested slug with the current route. No equivalent sequence guard is currently present in the remaining SFCs; do not accidentally add state updates after unmount or alter their existing loading/error semantics while converting.

### Options-coupled test map

| Test coverage | Coupling | Required adaptation before the affected wave |
| --- | --- | --- |
| `app/tests/blogFrontend.test.js` | `blogComponent`, `archiveComponent`, and `blogArticleComponent` rewrite `export default defineComponent` and execute Options objects in a VM; assertions call `methods`, `computed`, and `watch` directly. | Before waves 1 and 3, move observable archive/article behavior to independently importable functions or exercise the rendered behavior. Remove the VM source rewriting and Options-object assertions without losing stale-response, route-query, navigation, and article-format coverage. |
| `app/tests/adminFrontend.test.js` | Source-level assertions currently refer to Options-era `this.$router`, `this.session`, `beforeRouteLeave`, and component internals. | Before waves 2, 4, and 5, retain route, authorization, and leave-guard behavior through public helpers or rendered behavior; update assertions that only encode the Options shape. |
| `app/tests/routingConfiguration.test.js` and `app/tests/publicResponsiveLayout.test.js` | These read SFC source for route/template contracts rather than execute an Options object. | Recheck after waves 1 and 2; preserve the user-visible routing, SEO, and responsive-template guarantees while avoiding new structural assertions against Composition internals. |

Initial RED verification intentionally targets only wave 1. Later arrays are already present in the structural test and are activated one at a time immediately before their corresponding conversion; no SFC is converted by this inventory task.

## Composition API Validation

- Converted all 15 Vue SFCs to Composition API with `<script setup>`.
- Removed structural Options API remnants and updated tests that depended on Options object internals.
- Preserved native dialog usage, administrative authorization, request guards, metadata, timers, template refs, and the editor route-leave guard.
- Validation in the container: structural scan covers 15/15 SFCs; lint passes; all 312 tests pass; the production SPA build passes; and `/`, `/blog`, `/admin`, `/admin/tags`, `/admin/profile`, and `/admin/articles/new` return HTML with status 200.

## ESLint Tooling Group

- Installed `eslint@10.9.1`, `eslint-plugin-vue@10.10.0`, and the required `vue-eslint-parser@10.4.1` peer.
- Retained the existing flat configuration and replaced the filename-based `Admin.vue` suppression with an explicit multi-word component name through `defineOptions`.
- No `--force`, persistent legacy-peer setting, or broad lint suppression was introduced. A one-time lockfile bootstrap ignored the stale ESLint 9 peer tree, after which a normal install and `npm ls` confirmed a valid ESLint 10 dependency graph.
- Validation in the container: lint passes, all 312 tests pass, and npm reports zero known vulnerabilities for the installed application dependency tree.

## Tailwind CSS Group

- Browser decision: accepted the Tailwind CSS v4 baseline of Chrome 111+, Edge 111+, Safari 16.4+, and Firefox 128+; the Quasar browser targets now declare those minimums with ES2022 output.
- Installed `tailwindcss@4.3.3` and `@tailwindcss/postcss@4.3.3`; removed the redundant Autoprefixer integration because Tailwind v4 handles imports and vendor prefixing through its official build path.
- Replaced the v3 `@tailwind` directives with `@import "tailwindcss" important` to preserve the project's existing global utility precedence. Removed the empty legacy JavaScript configuration because v4 discovers application sources automatically and the only non-default setting moved into CSS.
- The production build generates standard, arbitrary-value, and responsive utilities used by representative public pages, including the article width and embedded-video aspect ratio rules. Public and administrative templates and component styles were not otherwise changed by this group.
- Compatibility impact: browsers older than the accepted minimum are no longer supported. Route smoke checks pass, but representative public/admin desktop and mobile visual inspection remains pending because generated utility presence does not detect every Preflight or layout change.

## Final Validation And Review

- Clean install: `npm ci` completes from the committed manifest/lockfile contract; `npm audit --audit-level=high` reports zero known vulnerabilities.
- Static/runtime validation: lint passes, all 312 tests pass, the production SPA build succeeds, and representative public/admin routes return HTML with status 200 from the container runtime.
- Independent review found and resolved two Composition regressions: the article editor now dereferences its textarea template ref before reading selection/focus APIs, and administrative Identity callbacks now unsubscribe or become inert on unmount with latest-request guards for asynchronous page loads.
- Upgraded majors: Quasar CLI/Vite 3, Quasar extras 2, Vue Router 5, ESLint 10, Vue ESLint plugin/parser 10, and Tailwind CSS/PostCSS 4.
- Deferred majors: none. Reverted majors: none.
- Remaining acceptance evidence: desktop and mobile visual inspection of representative public/admin pages in staging is still required for Tailwind task 5.3.
