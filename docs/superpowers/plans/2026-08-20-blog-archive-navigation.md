# Blog Archive And Article Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return completed admin editor actions to the dashboard, replace the three-card public blog pagination with a URL-backed hybrid index plus chronological article navigation, add safe owner tag management, support Gravatar-first author photos, and keep public and administrative surfaces usable on phone-sized viewports.

**Architecture:** A dedicated public `blog-index` API owns filtering, highlight exclusion, and 12-item pagination, while a separate failure-tolerant endpoint resolves chronological article neighbors. Pure frontend route helpers make the query string canonical, focused components render highlights and compact archive rows, and successful terminal editor actions replace the editor route with `/admin`. The authenticated admin facade owns bounded tag usage counts, safe deletion, and public Gravatar-profile resolution; browser photo consumers use canonical Gravatar URLs with an allowlisted fallback and initials. Responsive behavior preserves desktop composition while adding bounded public content, mobile dashboard cards, and explicit compact editor groups at the existing 700/720-pixel breakpoints.

**Tech Stack:** Node.js 22, Vue 3 Options API, Vue Router 4, Quasar 2, Netlify Functions, Contentful Delivery API, `node:test`.

**Spec:** `docs/superpowers/specs/2026-08-20-blog-archive-navigation-design.md`

## Global Constraints

- Never read `.env`, `.env.*`, secrets, credentials, or private keys.
- Install no package, binary, browser, or system dependency.
- Use the current checkout and existing container; do not create worktrees or duplicate the development stack.
- Do not run `git add`, commit, push, or pull without explicit authorization for that specific operation.
- Keep public Article and Contentful content-model fields unchanged.
- Keep existing article URLs shareable and free of archive-return query parameters.
- Preserve legacy `/blog/tags/:tag` URLs through an internal redirect.
- Keep Contentful diagnostics and configuration out of public API errors.
- Restrict tag deletion and tag-management access to the owner role.
- Require two sequential confirmations and server-side zero-usage revalidation before deleting a tag.
- Exclude `article-lang-pt-br` and `article-lang-en-us` from public and administrative tag choices.
- Preserve desktop table, editor, public navigation, and lifecycle behavior while adapting compact layouts.
- Use 700 pixels as the public compact breakpoint and 720 pixels as the administrative compact breakpoint.
- Add no package, browser, responsive framework, or test dependency.

---

### Task 1: OpenSpec Change Contract

**Files:**
- Create: `openspec/changes/improve-blog-archive-navigation/proposal.md`
- Create: `openspec/changes/improve-blog-archive-navigation/design.md`
- Create: `openspec/changes/improve-blog-archive-navigation/specs/blog-public/spec.md`
- Create: `openspec/changes/improve-blog-archive-navigation/specs/blog-admin/spec.md`
- Create: `openspec/changes/improve-blog-archive-navigation/tasks.md`

**Interfaces:**
- Consumes: the approved design document.
- Produces: delta requirements for `blog-public` plus the admin terminal-action navigation requirement.

- [ ] **Step 1: Create the proposal and design artifacts**

Use change ID `improve-blog-archive-navigation`. The proposal must identify the hybrid archive, canonical URL state, chronological article navigation, and editor return behavior as separate outcomes. The OpenSpec design must reference the approved design rather than redefining conflicting contracts.

- [ ] **Step 2: Write the public delta requirements**

Include literal requirements and scenarios for:

```markdown
### Requirement: Public Blog Provides A Scalable Hybrid Archive
The system SHALL present automatic recent highlights and a compact paginated archive whose state is represented by the public URL.

#### Scenario: Reader opens the unfiltered first page
- **WHEN** the reader opens `/blog` without filters
- **THEN** the three newest public articles appear as highlights
- **AND** those articles do not appear in any page of the unfiltered archive dataset

#### Scenario: Reader filters the archive
- **WHEN** the reader selects search text, year, or tag
- **THEN** highlights are hidden and all matching public articles participate in the archive results
- **AND** the filter state is represented in the URL
```

Add scenarios for 12-item pagination, invalid/out-of-range query normalization, history restoration, empty/error states, and compact responsive rendering.

- [ ] **Step 3: Write article and admin navigation requirements**

Require a clean article URL, a visible archive return action, global chronological older/newer links, failure-tolerant neighbor loading, and `/admin` route replacement after successful Save draft, Submit for review, Request unpublication, and Owner unpublish actions.

- [ ] **Step 4: Write task tracking matching this plan**

Create task sections for API contracts, frontend route state, hybrid layout, article navigation, admin redirect, and verification. Do not mark staging or manual responsive checks complete before they are performed.

- [ ] **Step 5: Validate the new change**

Run:

```bash
rtk openspec validate improve-blog-archive-navigation --strict
```

Expected: `Change 'improve-blog-archive-navigation' is valid`.

- [ ] **Step 6: Request authorization for the OpenSpec commit**

Stop and request explicit authorization. Only after approval:

```bash
rtk git add openspec/changes/improve-blog-archive-navigation docs/superpowers/specs/2026-08-20-blog-archive-navigation-design.md docs/superpowers/plans/2026-08-20-blog-archive-navigation.md
rtk git commit -m "docs(blog): Adds archive navigation change"
```

### Task 2: Admin Terminal-Action Redirect

**Files:**
- Modify: `app/src/pages/AdminArticleEditor.vue`
- Modify: `app/src/utils/adminDashboard.js`
- Test: `app/tests/adminFrontend.test.js`

**Interfaces:**
- Produces: `returnToAdminDashboard(router): Promise<unknown>` using `router.replace("/admin")`.
- Consumes: successful completion of the existing editor mutations.

- [ ] **Step 1: Write failing redirect tests**

Add a utility behavior test:

```js
it("replaces the editor route with the dashboard after a terminal action", async () => {
  const calls = [];
  const router = { replace: async (path) => calls.push(path) };

  await returnToAdminDashboard(router);

  assert.deepEqual(calls, ["/admin"]);
});
```

Add source contract assertions proving `saveDraft`, `submitReview`, `requestUnpublication`, and `ownerUnpublish` await `returnToAdminDashboard(this.$router)` only inside their successful `try` path.

- [ ] **Step 2: Run the focused test and verify RED**

```bash
rtk docker exec marcelo-munhoz_ctn node --test --test-reporter=spec tests/adminFrontend.test.js
```

Expected: FAIL because `returnToAdminDashboard` is not exported or used.

- [ ] **Step 3: Implement the redirect utility and successful-action calls**

Add:

```js
export const returnToAdminDashboard = (router) => router.replace("/admin");
```

Import it in `AdminArticleEditor.vue`. After each successful mutation has updated local state, call:

```js
await returnToAdminDashboard(this.$router);
```

Do not call it from any `catch` or `finally` block.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the Task 2 test command. Expected: all admin frontend tests pass.

- [ ] **Step 5: Request authorization for the admin redirect commit**

Stop and request explicit authorization. Only after approval:

```bash
rtk git add app/src/pages/AdminArticleEditor.vue app/src/utils/adminDashboard.js app/tests/adminFrontend.test.js
rtk git commit -m "feat(admin): Returns completed editor actions to dashboard"
```

### Task 3: Public Blog Index API

**Files:**
- Modify: `app/netlify/functions/contentfulProxyCore.js`
- Modify: `app/middleware/routes/contentful.js`
- Test: `app/tests/contentfulProxy.test.js`
- Test: `app/tests/routingConfiguration.test.js`

**Interfaces:**
- Produces: `GET /api/contentful/blog-index?page=&q=&year=&tag=`.
- Produces response `{ featured, items, total, page, pageSize: 12, totalPages }`.
- Preserves: existing `/entries`, `/tagged`, `/tags`, `/article/:slug`, and `/author/:slug` contracts during migration.

- [ ] **Step 1: Write failing normalization and query-construction tests**

Cover these literal inputs:

```js
{ page: "0", q: "  system   design  ", year: "2025", tag: "AI" }
{ page: "66", q: "x".repeat(120), year: "1800", tag: "bad tag!" }
```

Assert page defaults to 1, search becomes `system design`, search is capped at 100 characters, invalid year/tag are omitted, and no arbitrary query key reaches `getEntries`.

- [ ] **Step 2: Write failing unfiltered index tests**

For page 1, assert one Contentful request selects the newest three entries and another requests 12 archive entries with `skip: 3`. Assert the returned archive `total` equals `Math.max(0, contentfulTotal - 3)` and no featured ID appears in `items`.

For page 2, assert `featured` is empty and archive skip is:

```js
3 + (2 - 1) * 12
```

- [ ] **Step 3: Write failing filtered and out-of-range tests**

Assert filtered requests use only:

```js
{
  content_type: "article",
  order: "-fields.createAt,-sys.createdAt",
  limit: 12,
  skip: 0,
  query: "architecture",
  "fields.createAt[gte]": "2025-01-01T00:00:00.000Z",
  "fields.createAt[lt]": "2026-01-01T00:00:00.000Z",
  "metadata.tags.sys.id[all]": "AI"
}
```

Assert a requested page above `totalPages` triggers one corrected archive read and returns the last valid page. Empty collections return page 1 and `totalPages: 1`.

- [ ] **Step 4: Run proxy tests and verify RED**

```bash
rtk docker exec marcelo-munhoz_ctn node --test --test-reporter=spec tests/contentfulProxy.test.js tests/routingConfiguration.test.js
```

Expected: FAIL because `/blog-index` is not routed.

- [ ] **Step 5: Implement allowlisted query normalization**

Add constants:

```js
const BLOG_FEATURED_LIMIT = 3;
const BLOG_ARCHIVE_LIMIT = 12;
const BLOG_SEARCH_LIMIT = 100;
```

Implement private helpers that return only normalized `page`, `q`, `year`, and `tag`. Use `fields.createAt` then `sys.createdAt` for every blog-index ordering.

- [ ] **Step 6: Implement index assembly and page correction**

For unfiltered data, offset every archive page by `BLOG_FEATURED_LIMIT` and subtract three from the Contentful total. Fetch `featured` only on page 1. For filtered data, use no featured offset and return `featured: []`. When the first archive response proves the page is out of range, repeat only the archive request with the corrected skip.

- [ ] **Step 7: Mount the local route**

Add `/blog-index` to the Express public route list without changing admin routing or CORS behavior.

- [ ] **Step 8: Run focused tests and verify GREEN**

Run the Task 3 command. Expected: all proxy and routing tests pass.

- [ ] **Step 9: Request authorization for the blog-index API commit**

Stop and request explicit authorization. Only after approval:

```bash
rtk git add app/netlify/functions/contentfulProxyCore.js app/middleware/routes/contentful.js app/tests/contentfulProxy.test.js app/tests/routingConfiguration.test.js
rtk git commit -m "feat(blog): Adds scalable archive API"
```

### Task 4: Chronological Article Navigation API

**Files:**
- Modify: `app/netlify/functions/contentfulProxyCore.js`
- Modify: `app/middleware/routes/contentful.js`
- Test: `app/tests/contentfulProxy.test.js`

**Interfaces:**
- Produces: `GET /api/contentful/article-navigation/:slug`.
- Produces: `{ previous: ArticleLink | null, next: ArticleLink | null }` where `ArticleLink` is `{ title, slug }`.
- Consumes: the same `fields.createAt`, then `sys.createdAt`, chronology used by `/blog-index`.

- [ ] **Step 1: Write failing middle and boundary tests**

Use a current article plus older/newer fixtures. Assert:

```js
assert.deepEqual(payload, {
  previous: { title: "Older article", slug: "older-article" },
  next: { title: "Newer article", slug: "newer-article" },
});
```

Add oldest/newest cases where one value is `null`, a missing slug case returning 404, and a response-body assertion that rejects `body`, author identity metadata, and upstream diagnostics.

- [ ] **Step 2: Write failing equal-date ordering tests**

Use entries with identical `fields.createAt` and distinct `sys.createdAt`. Assert the immediately older/lower `sys.createdAt` entry is `previous` and the immediately newer/higher entry is `next` before falling across editorial dates.

- [ ] **Step 3: Run navigation tests and verify RED**

```bash
rtk docker exec marcelo-munhoz_ctn node --test --test-reporter=spec --test-name-pattern="article navigation|chronological neighbor" tests/contentfulProxy.test.js
```

Expected: FAIL with a 404 unknown route or missing neighbor payload.

- [ ] **Step 4: Implement neighbor lookup**

Resolve the current entry by slug, then query same-date neighbors using `sys.createdAt[lt]`/`[gt]` before querying adjacent editorial dates using `fields.createAt[lt]`/`[gt]`. Prefer same-date candidates and use ascending order for the nearest newer candidate, descending order for the nearest older candidate.

Map every result through:

```js
const publicArticleLink = (entry) => ({
  title: String(entry.fields?.title || ""),
  slug: String(entry.fields?.slug || ""),
});
```

When `fields.createAt` is absent, compare `sys.createdAt` only.

- [ ] **Step 5: Mount the local route and verify GREEN**

Add `/article-navigation/:slug` to the Express route matcher and rerun all proxy tests. Expected: all pass.

- [ ] **Step 6: Request authorization for the navigation API commit**

Stop and request explicit authorization. Only after approval:

```bash
rtk git add app/netlify/functions/contentfulProxyCore.js app/middleware/routes/contentful.js app/tests/contentfulProxy.test.js
rtk git commit -m "feat(blog): Adds chronological article navigation"
```

### Task 5: Canonical Blog Route State

**Files:**
- Create: `app/src/utils/blogArchive.js`
- Modify: `app/src/router/index.js`
- Test: `app/tests/blogArchive.test.js`
- Test: `app/tests/routingConfiguration.test.js`

**Interfaces:**
- Produces: `normalizeBlogRouteQuery(query): BlogArchiveState`.
- Produces: `blogRouteQuery(state): Record<string, string>`.
- Produces: `blogArticleLocation(article, currentFullPath): RouteLocationRaw`.
- Produces: `blogReturnLocation(historyState): string`.

- [ ] **Step 1: Write failing pure route-state tests**

Assert:

```js
assert.deepEqual(normalizeBlogRouteQuery({ page: "4", q: "  architecture  ", year: "2025", tag: "AI" }), {
  page: 4,
  q: "architecture",
  year: "2025",
  tag: "AI",
});

assert.deepEqual(blogRouteQuery({ page: 1, q: "", year: "", tag: "" }), {});
assert.equal(blogReturnLocation({ blogReturnTo: "/blog?page=66&tag=AI" }), "/blog?page=66&tag=AI");
assert.equal(blogReturnLocation({ blogReturnTo: "https://untrusted.example.test" }), "/blog");
```

Assert `blogArticleLocation` returns a clean named article route plus `{ blogReturnTo: currentFullPath }` in router history state.

- [ ] **Step 2: Write failing saved-scroll test**

Update routing configuration coverage to require:

```js
scrollBehavior(_to, _from, savedPosition) {
  return savedPosition || { left: 0, top: 0 };
}
```

- [ ] **Step 3: Run route-state tests and verify RED**

```bash
rtk docker exec marcelo-munhoz_ctn node --test --test-reporter=spec tests/blogArchive.test.js tests/routingConfiguration.test.js
```

Expected: FAIL because the helper module and saved-position behavior do not exist.

- [ ] **Step 4: Implement route-state helpers**

Use the same parameter bounds as the backend. `blogReturnLocation` must accept only strings equal to `/blog` or beginning with `/blog?`; reject protocol-relative paths and all other routes.

- [ ] **Step 5: Implement router saved-position restoration**

Replace the unconditional top reset with the tested `savedPosition` fallback. Do not change history mode or route guards.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run the Task 5 command. Expected: all pass.

- [ ] **Step 7: Request authorization for the route-state commit**

Stop and request explicit authorization. Only after approval:

```bash
rtk git add app/src/utils/blogArchive.js app/src/router/index.js app/tests/blogArchive.test.js app/tests/routingConfiguration.test.js
rtk git commit -m "feat(blog): Preserves archive route state"
```

### Task 6: Hybrid Public Blog Layout

**Files:**
- Create: `app/src/components/BlogHighlights.vue`
- Create: `app/src/components/BlogArchiveList.vue`
- Modify: `app/src/pages/Blog.vue`
- Delete: `app/src/components/ArticlesList.vue`
- Test: `app/tests/blogFrontend.test.js`
- Modify: `app/tests/adminFrontend.test.js` only if shared public markup assertions currently live there.

**Interfaces:**
- `BlogHighlights` consumes `articles: Article[]` and `returnTo: string`.
- `BlogArchiveList` consumes `articles: Article[]` and `returnTo: string`.
- `Blog.vue` consumes `/api/contentful/blog-index` and `/api/contentful/tags`.

- [ ] **Step 1: Write failing component contract tests**

Assert source-level contracts for:

- one primary and two secondary highlight positions;
- real article images through `articleCardImageUrl`;
- compact archive rows containing title, description, author, date, and tags;
- accessible labels `Search articles`, `Year`, and `Tag`;
- stable image aspect ratios and mobile stacking classes;
- article links built with `blogArticleLocation` rather than raw slug-only routes.

- [ ] **Step 2: Write failing Blog page state tests**

Require a route-query watcher, `normalizeBlogRouteQuery`, `blogRouteQuery`, a debounced search update, page reset on filter changes, `/blog-index`, 12-item pagination metadata, retry state, empty state, and tags loaded from `/api/contentful/tags`.

- [ ] **Step 3: Run frontend tests and verify RED**

```bash
rtk docker exec marcelo-munhoz_ctn node --test --test-reporter=spec tests/blogFrontend.test.js tests/adminFrontend.test.js
```

Expected: FAIL because hybrid components and route-backed behavior do not exist.

- [ ] **Step 4: Implement `BlogHighlights.vue`**

Use an editorial CSS grid with one primary article and two secondary articles on desktop, a single column below the mobile breakpoint, fixed image aspect ratios, visible focus states, and no nested cards. Render nothing for an empty `articles` array.

- [ ] **Step 5: Implement `BlogArchiveList.vue`**

Render unframed rows with a constrained thumbnail track and flexible text track. Use `publicArticleDates` and `articleLocaleFromArticle` for localized date display. Allow long titles and descriptions to wrap without moving controls or overlapping metadata.

- [ ] **Step 6: Rewrite `Blog.vue` as the orchestration surface**

Read canonical state from `$route.query`, request:

```js
buildApiUrl(`/api/contentful/blog-index?${new URLSearchParams(blogRouteQuery(state))}`)
```

Keep `searchInput` separate from committed route state for debounce. Use router `replace` for filter typing and router `push` for explicit page changes so browser history remains useful. Hide highlights whenever the API returns none. Preserve controls during loading and errors.

- [ ] **Step 7: Remove the obsolete three-card list**

Delete `ArticlesList.vue` only after `rg "ArticlesList|ArticleList" app/src` proves no remaining import or component registration.

- [ ] **Step 8: Run focused tests and verify GREEN**

Run Task 6 tests plus lint. Expected: all pass.

- [ ] **Step 9: Request authorization for the hybrid layout commit**

Stop and request explicit authorization. Only after approval:

```bash
rtk git add app/src/components/BlogHighlights.vue app/src/components/BlogArchiveList.vue app/src/pages/Blog.vue app/src/components/ArticlesList.vue app/tests/blogFrontend.test.js app/tests/adminFrontend.test.js
rtk git commit -m "feat(blog): Adds hybrid article archive"
```

### Task 7: Article Return And Previous/Next Controls

**Files:**
- Modify: `app/src/components/BlogArticle.vue`
- Modify: `app/src/utils/articleDates.js`
- Modify: `app/src/router/routes.js`
- Delete: `app/src/components/ArticlesTags.vue`
- Test: `app/tests/blogFrontend.test.js`
- Test: `app/tests/adminFrontend.test.js`
- Test: `app/tests/routingConfiguration.test.js`

**Interfaces:**
- Consumes: `/api/contentful/article-navigation/:slug`.
- Consumes: `blogReturnLocation(window.history.state)`.
- Produces: locale-aware archive, previous, and next labels.
- Preserves: `/blog/tags/:tag` as a redirect to `/blog?tag=:tag`.

- [ ] **Step 1: Write failing article navigation tests**

Require `BlogArticle.vue` to load navigation independently from the article, render a top archive action, render bottom previous/next titles only when present, and keep article rendering successful when the navigation response fails.

Add PT/EN label assertions:

```js
assert.deepEqual(articleNavigationLabels("pt-BR"), {
  all: "Todos os artigos",
  previous: "Artigo anterior",
  next: "Próximo artigo",
});
assert.deepEqual(articleNavigationLabels("en-US"), {
  all: "All articles",
  previous: "Previous article",
  next: "Next article",
});
```

- [ ] **Step 2: Write failing legacy-tag redirect tests**

Assert `/blog/tags/:tag` redirects to named route `Meus Artigos` with query `{ tag }`, and article tag links target that same query-based route.

- [ ] **Step 3: Run focused tests and verify RED**

```bash
rtk docker exec marcelo-munhoz_ctn node --test --test-reporter=spec tests/blogFrontend.test.js tests/adminFrontend.test.js tests/routingConfiguration.test.js
```

Expected: FAIL because article navigation and tag redirects are absent.

- [ ] **Step 4: Implement failure-tolerant article navigation**

After the article request succeeds, request its navigation payload in a separate `try/catch`. Navigation failure sets `{ previous: null, next: null }` and must not reset the article or loading state. Watch the route slug so clicking previous/next reloads the same component instance correctly.

- [ ] **Step 5: Implement return behavior and localized labels**

Use an icon-plus-text archive action linked to the validated return location. Previous/next links use clean named article routes and localize their labels using the article locale while always showing adjacent titles.

- [ ] **Step 6: Redirect old tag routes and remove the obsolete tag page**

Replace the `ArticlesTags.vue` route component with:

```js
redirect: (to) => ({ name: "Meus Artigos", query: { tag: to.params.tag } })
```

Update article tag links to `/blog?tag=...`. Delete `ArticlesTags.vue` only after verifying it has no remaining imports.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run the Task 7 command. Expected: all pass.

- [ ] **Step 8: Request authorization for the article navigation commit**

Stop and request explicit authorization. Only after approval:

```bash
rtk git add app/src/components/BlogArticle.vue app/src/utils/articleDates.js app/src/router/routes.js app/src/components/ArticlesTags.vue app/tests/blogFrontend.test.js app/tests/adminFrontend.test.js app/tests/routingConfiguration.test.js
rtk git commit -m "feat(blog): Adds chronological reading navigation"
```

### Task 8: Integrated Verification And Staging Handoff

**Files:**
- Modify: `README.md`
- Modify: `openspec/changes/improve-blog-archive-navigation/tasks.md`
- Create: `openspec/changes/improve-blog-archive-navigation/staging-handoff.md`
- Create: `app/tests/blogNavigationRoundTrip.test.js`
- Test: all application tests.

**Interfaces:**
- Consumes: all prior task contracts.
- Produces: verified implementation plus explicit manual staging checks.

- [ ] **Step 1: Add a cross-layer blog navigation contract test**

Pass a controlled article fixture through blog-index assembly, route-state serialization, article route state, public article lookup, and chronological navigation. Assert the same slug and editorial order survive every boundary.

- [ ] **Step 2: Run the complete automated suite**

```bash
rtk docker exec marcelo-munhoz_ctn node --test --test-reporter=spec
rtk docker exec marcelo-munhoz_ctn npm run lint
rtk docker exec marcelo-munhoz_ctn npm run build
rtk docker exec marcelo-munhoz_ctn npm run scan:build-credentials
```

Expected: every command exits 0; no credential pattern is reported.

- [ ] **Step 3: Validate OpenSpec and repository hygiene**

```bash
rtk openspec validate improve-blog-archive-navigation --strict
rtk git diff --check
```

Expected: strict validation succeeds and `git diff --check` emits no output.

- [ ] **Step 4: Restart only the local backend process**

Because `node middleware/server.js` does not watch backend files, stop and restart that process inside the existing container. Do not restart through the Compose command because it invokes `npm i`.

- [ ] **Step 5: Perform responsive local smoke checks**

At desktop and mobile widths, verify:

- unfiltered page 1 shows exactly three highlights and no duplicate archive entries;
- filtered states hide highlights;
- page/filter URL state survives article navigation and browser Back;
- direct article access falls back to `/blog`;
- oldest/newest article boundaries show only the available direction;
- loading, empty, error, and long-title states do not overlap;
- successful terminal admin actions return to `/admin` while failed actions stay in the editor.

- [ ] **Step 6: Document staging checks**

Record only sanitized observations. Include public index/search/filter/history checks, clean shared article URLs, chronological links, legacy tag redirects, and admin terminal-action redirects. Leave staging tasks unchecked until the deployed branch is tested.

- [ ] **Step 7: Request authorization for the final verification commit**

Stop and request explicit authorization. Only after approval:

```bash
rtk git add README.md openspec/changes/improve-blog-archive-navigation app/tests
rtk git commit -m "test(blog): Adds archive navigation verification"
```

- [ ] **Step 8: Stop before merge, sync, or archive**

Report the working-tree state, verification evidence, and remaining staging checks. Do not push, merge, sync specs, or archive the OpenSpec change without the user's next explicit instruction. When archive is later authorized, synchronize the delta specs before archiving as required by repository policy.

### Task 9: Owner Tag Management API

**Files:**
- Modify: `app/middleware/contentfulAdmin.js`
- Modify: `app/netlify/functions/contentfulAdminCore.js`
- Modify: `app/src/utils/adminApi.js`
- Test: `app/tests/contentfulManagementFacade.test.js`
- Test: `app/tests/contentfulAdmin.test.js`
- Test: `app/tests/adminFrontend.test.js`

**Interfaces:**
- Produces: owner-only `listManagedTags()` through `GET /api/admin/contentful/tags/manage`, returning `{ tags: Array<{ id, label, visibility, articleCount }> }`.
- Produces: owner-only `deleteTag({ tagId })` through `DELETE /api/admin/contentful/tags/:tagId`.
- Preserves: existing `GET /tags`, `POST /tags`, article mutations, and sanitized admin errors.

- [ ] **Step 1: Write failing usage-count and reserved-tag tests**

Use active, draft, changed, and archived article fixtures. Assert counts are grouped by metadata tag ID and that `article-lang-pt-br` and `article-lang-en-us` are absent from the response.

```js
assert.deepEqual(result.tags, [
  { id: "ai", label: "AI", visibility: "public", articleCount: 2 },
]);
```

- [ ] **Step 2: Write failing authorization and deletion tests**

Assert writers receive 403, zero-use deletion sends the versioned Contentful delete request, a changed usage count returns 409 before deletion, and a provider reference conflict becomes a sanitized 409 response.

- [ ] **Step 3: Run focused API tests and verify RED**

```bash
rtk docker compose exec -T app node --test --test-reporter=spec tests/contentfulManagementFacade.test.js tests/contentfulAdmin.test.js tests/adminFrontend.test.js
```

Expected: FAIL because usage counts, owner-only delete routing, and the frontend delete helper do not exist.

- [ ] **Step 4: Implement bounded counting and safe deletion**

Traverse article metadata with explicit Contentful page limits, count tag IDs across editorial states, and fail closed if the bounded collection cannot be proven complete. Before deletion, query all entries and assets for the selected tag with explicit one-item bounds; delete only when both totals are zero and translate upstream reference/version conflicts without returning raw diagnostics.

- [ ] **Step 5: Add the authenticated frontend helper**

Add `deleteContentfulTag({ tagId, session, fetchImpl })` using the existing `adminRequest` path and authorization behavior. Do not place provider identifiers or credentials in client logs.

- [ ] **Step 6: Run focused API tests and verify GREEN**

Run the Task 9 command. Expected: all pass.

### Task 10: Tag Management UI And Clickable Article Tags

**Files:**
- Modify: `app/src/pages/Admin.vue`
- Modify: `app/src/pages/AdminArticleEditor.vue`
- Modify: `app/src/router/routes.js`
- Create: `app/src/pages/AdminTags.vue`
- Create: `app/src/utils/adminTags.js`
- Test: `app/tests/adminFrontend.test.js`
- Test: `app/tests/routingConfiguration.test.js`
- Test: `app/tests/blogFrontend.test.js`

**Interfaces:**
- Consumes: Task 9 tag list, create, and delete contracts.
- Produces: owner-only `/admin/tags` UI and `toggleArticleTagFilter(filters, selected)` behavior.
- Preserves: all non-tag article filters and the existing article editor tag workflow.

- [ ] **Step 1: Write failing UI and route tests**

Assert the owner navigation exposes tag management, writers cannot enter it, each row shows label/ID/visibility/count, and reserved language tags are removed from public and editor option normalization.

- [ ] **Step 2: Write failing article-chip toggle tests**

```js
assert.deepEqual(toggleArticleTagFilter({ search: "cloud", tag: "" }, "ai"), { search: "cloud", tag: "ai" });
assert.deepEqual(toggleArticleTagFilter({ search: "cloud", tag: "ai" }, "ai"), { search: "cloud", tag: "" });
```

Assert the selected tag chip uses the inverse style and other filter-model values remain unchanged.

- [ ] **Step 3: Write failing double-confirmation tests**

Assert cancelling either dialog sends no request. Assert deletion is disabled for `articleCount > 0`; for zero usage, exactly two accepted confirmations precede one delete request and the refreshed list omits the deleted tag.

- [ ] **Step 4: Run focused frontend tests and verify RED**

```bash
rtk docker compose exec -T app node --test --test-reporter=spec tests/adminFrontend.test.js tests/blogFrontend.test.js tests/routingConfiguration.test.js
```

Expected: FAIL because the page, route, filter toggle, reserved-tag option filter, and confirmation flow are absent.

- [ ] **Step 5: Implement the focused UI**

Build the management table without embedded article results. Reuse the existing tag creation flow, show a remove-tags-first explanation for nonzero counts, and implement two sequential Quasar confirmations for zero-count deletion. Make table tag chips keyboard-operable and toggle only the tag filter.

- [ ] **Step 6: Run focused frontend tests and verify GREEN**

Run the Task 10 command. Expected: all pass.

### Task 11: Tag Management Verification And Review

**Files:**
- Modify: `openspec/changes/improve-blog-archive-navigation/tasks.md`
- Modify: `openspec/changes/improve-blog-archive-navigation/staging-handoff.md`
- Test: all application tests.

**Interfaces:**
- Consumes: Tasks 9 and 10.
- Produces: verified tag management with unchecked staging evidence until deployed testing occurs.

- [ ] **Step 1: Run full automated verification**

```bash
rtk docker compose exec -T app node --test --test-reporter=spec
rtk docker compose exec -T app npm run lint
rtk docker compose exec -T app npm run build
rtk docker compose exec -T app npm run scan:build-credentials
rtk openspec validate improve-blog-archive-navigation --strict
rtk git diff --check
```

Expected: every command exits 0 and the credential scan reports no credential pattern.

- [ ] **Step 2: Request focused review**

Request review specifically for owner authorization, complete count semantics, stale-count/provider conflicts, reserved-tag filtering, double confirmation, and preservation of unrelated article filters. Resolve findings before checking OpenSpec Task 8.3.

- [ ] **Step 3: Perform staging smoke checks**

With disposable tags, verify create, zero/nonzero counts, blocked in-use deletion, both confirmation cancellations, successful unused deletion, writer denial, tag-chip toggle styling, and preservation of other article filters. Keep OpenSpec Task 8.4 unchecked until this deployed check succeeds.

- [ ] **Step 4: Update only verified checklist items**

Mark Tasks 7 and 8 complete only where implementation, automated evidence, focused review, and staging evidence actually exist. Do not archive the change; when later authorized, synchronize delta specs before archival.

### Task 12: Gravatar-First Author Photos And Alignment

**Files:** `app/src/utils/authorPhotos.js`, author-profile frontend/backend surfaces, `app/src/pages/AdminTags.vue`, related tests, CSP, and OpenSpec artifacts.

- [ ] Write failing tests for Gravatar slug/URL/hash normalization, canonical 192-pixel URLs, safe fallback hosts, legacy photos, server-side slug resolution, and centered tag columns.
- [ ] Resolve public profile slugs only while saving; persist canonical hash metadata without Identity fields or raw emails.
- [ ] Render Gravatar, fallback, then initials across admin preview, account menu, and public author profile; add square-image guidance.
- [ ] Run focused and complete verification, request focused review, and keep deployed smoke items unchecked until exercised in staging.

### Task 13: Responsive Global Shell And Public Pages

**Files:**
- Modify: `app/src/layouts/MainLayout.vue`
- Modify: `app/src/pages/IndexPage.vue`
- Modify: `app/src/pages/About.vue`
- Modify: `app/src/components/BlogArticle.vue`
- Modify: `app/src/App.vue`
- Create: `app/tests/publicResponsiveLayout.test.js`
- Modify: `app/tests/blogFrontend.test.js`

**Interfaces:**
- Preserves: existing routes, header destinations, account-menu behavior, public content, article sharing, and desktop layout.
- Produces: compact public composition at `max-width: 700px` with no document-level horizontal overflow.

- [ ] **Step 1: Write failing structural regression tests**

Add source-contract tests that assert:

```js
assert.match(layout, /class="site-toolbar"/);
assert.match(layout, /class="site-toolbar-title"/);
assert.match(layout, /aria-label="About"/);
assert.match(layout, /white-space:\s*normal/);
assert.match(home, /clamp\(/);
assert.match(home, /knowledge-grid/);
assert.match(about, /about-introduction/);
assert.match(article, /overflow-wrap:\s*anywhere/);
assert.match(article, /overflow-x:\s*auto/);
```

Require an explicit `@media (max-width: 700px)` contract, bounded account-menu width, wrapped article tags, responsive Markdown images, and a scrollable cookie-card body for short viewports.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
rtk docker compose exec -T app node --test --test-reporter=spec tests/publicResponsiveLayout.test.js tests/blogFrontend.test.js
```

Expected: FAIL because the shell/public responsive classes and containment rules are absent.

- [ ] **Step 3: Implement the compact global shell**

Add semantic classes to the toolbar, title, navigation actions, footer content, and cookie card. At `max-width: 700px`:

```scss
.site-toolbar-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.site-footer-content { min-width: 0; overflow: visible; overflow-wrap: anywhere; white-space: normal; }
.admin-account-list { min-width: min(240px, calc(100vw - 24px)); }
```

Hide only the visual labels of About, Blog, and Admin at the compact breakpoint; retain icons, `aria-label`, tooltips, routes, and keyboard behavior. Bound and internally scroll the cookie notice without changing pending consent.

- [ ] **Step 4: Implement bounded Home, About, and article content**

Replace fixed Home text sizes with fluid values such as `clamp(2rem, 10vw, 4rem)` and `clamp(1.6rem, 7vw, 3rem)`. Make the hero image responsive, wrap knowledge icons and project chips, stack About image/text at 700 pixels, and explicitly constrain article tags, Markdown images, preformatted blocks, and tables.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the Task 13 command. Expected: both suites pass with no skipped tests.

- [ ] **Step 6: Request authorization for the public responsive commit**

Stop and present the exact staged scope and message before any commit:

```text
fix(layout): Improves public mobile composition
- Compacts accessible header controls and allows footer content to wrap
- Scales Home and About layouts without viewport overflow
- Bounds article Markdown, tags, images, code, and tables on phones
```

### Task 14: Responsive Administrative Dashboard

**Files:**
- Create: `app/src/components/AdminArticleCard.vue`
- Modify: `app/src/pages/Admin.vue`
- Modify: `app/tests/adminFrontend.test.js`

**Interfaces:**
- `AdminArticleCard` consumes `article`, `session`, `activeTag`, and `loadingAction` props.
- `AdminArticleCard` emits `edit`, `review`, `request-unpublication`, `publish`, `unpublish`, `archive`, `unarchive`, `delete`, and `toggle-tag` with the current article or tag ID.
- Preserves: the same authorization helpers and mutation handlers used by desktop table rows.

- [ ] **Step 1: Write failing mobile-card contract tests**

Require `Admin.vue` to enable Quasar grid mode when `$q.screen.width <= 720` and provide an `#item` slot using `AdminArticleCard`. Assert the card exposes title, status, author, date, tags, and every guarded lifecycle action. Assert emitted events are connected to the existing handlers and `toggleTagFilter`.

Add structural checks for a two-column phone metrics grid, horizontally reachable status controls, stacked panel headings, and wrapping review actions.

- [ ] **Step 2: Run focused dashboard tests and verify RED**

```bash
rtk docker compose exec -T app node --test --test-reporter=spec tests/adminFrontend.test.js
```

Expected: FAIL because `AdminArticleCard`, grid mode, and compact dashboard contracts do not exist.

- [ ] **Step 3: Implement the mobile article card**

Render labelled metadata and tag chips, importing the existing `can*ArticleAction` helpers rather than duplicating lifecycle logic. Every event must carry the same article object consumed by desktop handlers. Keep tag chips keyboard-operable with `aria-pressed`.

- [ ] **Step 4: Connect QTable grid mode without changing desktop rows**

Use:

```vue
<q-table :grid="$q.screen.width <= 720" ...>
  <template #item="props">
    <admin-article-card :article="props.row" ... />
  </template>
</q-table>
```

Map card events to the existing edit, review, publication, archive, deletion, and filter methods. Desktop body-cell slots remain unchanged.

- [ ] **Step 5: Compact dashboard supporting layout**

At `max-width: 720px`, use two metric columns down to 340 pixels and one below that threshold, stack panel headings, keep filter tabs internally scrollable, and make review metadata/actions wrap without clipping. Do not use document-level `overflow-x: hidden` as the primary containment fix.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run the Task 14 command. Expected: all admin frontend tests pass.

- [ ] **Step 7: Request authorization for the dashboard commit**

Stop and present the exact staged scope and message:

```text
fix(admin): Adds responsive article cards
- Preserves the desktop article table while rendering complete mobile cards
- Keeps role and lifecycle actions available through shared authorization guards
- Compacts dashboard metrics, filters, and review queues on phones
```

### Task 15: Responsive Focused Article Editor

**Files:**
- Modify: `app/src/pages/AdminArticleEditor.vue`
- Modify: `app/tests/adminFrontend.test.js`

**Interfaces:**
- Preserves: editor form model, Markdown insertion methods, locale switching, media handlers, validation, and terminal actions.
- Produces: responsive toolbar groups, media controls, dialog containment, and workflow actions at `max-width: 720px`.

- [ ] **Step 1: Write failing editor-layout tests**

Require named `markdown-format-actions` and `markdown-mode-actions` groups, compact heading/status classes, responsive media-action classes, a bounded media dialog, and mobile workflow-action rules. Assert every existing Markdown command and Editor/Preview option remains present.

- [ ] **Step 2: Run focused editor tests and verify RED**

```bash
rtk docker compose exec -T app node --test --test-reporter=spec tests/adminFrontend.test.js
```

Expected: FAIL because the responsive editor groups and containment contracts are absent.

- [ ] **Step 3: Separate formatting and mode controls**

Group the existing formatting buttons without changing click handlers. At 720 pixels, allow formatting controls to wrap or scroll inside their own row and place the Editor/Preview toggle on a separate full-width row. Keep visible focus and do not hide commands.

- [ ] **Step 4: Adapt heading, fields, media, and workflow actions**

Stack the heading composition and form rows. Use two media columns at intermediate widths and one at phone widths; set buttons and file input to `min-width: 0; width: 100%`. Bound the media dialog with `max-width: calc(100vw - 24px)`, `max-height: calc(100dvh - 24px)`, and internal scrolling. Make the primary terminal action full-width with secondary actions wrapping beneath it.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the Task 15 command. Expected: all admin frontend tests pass.

- [ ] **Step 6: Request authorization for the editor commit**

Stop and present the exact staged scope and message:

```text
fix(admin): Improves mobile article editing
- Separates Markdown formatting and mode controls on compact screens
- Stacks editor fields and bounds media previews and dialogs
- Keeps workflow actions reachable without changing mutation behavior
```

### Task 16: Responsive Integration, Review, And Staging Evidence

**Files:**
- Modify: `openspec/changes/improve-blog-archive-navigation/proposal.md`
- Modify: `openspec/changes/improve-blog-archive-navigation/design.md`
- Modify: `openspec/changes/improve-blog-archive-navigation/specs/blog-admin/spec.md`
- Modify: `openspec/changes/improve-blog-archive-navigation/specs/blog-public/spec.md`
- Modify: `openspec/changes/improve-blog-archive-navigation/tasks.md`
- Modify: `openspec/changes/improve-blog-archive-navigation/staging-handoff.md`
- Modify: `docs/superpowers/specs/2026-08-20-blog-archive-navigation-design.md`
- Modify: `docs/superpowers/plans/2026-08-20-blog-archive-navigation.md`

**Interfaces:**
- Consumes: Tasks 13-15.
- Produces: reviewed responsive implementation and truthful automated/manual evidence.

- [ ] **Step 1: Run all automated validation**

```bash
rtk docker compose exec -T app npm test
rtk docker compose exec -T app npm run lint
rtk docker compose exec -T app npm run build
rtk docker compose exec -T app npm run scan:build-credentials
rtk openspec validate improve-blog-archive-navigation --strict
rtk git diff --check
```

Expected: every command exits 0, all test counts are recorded, and the credential scan reports no match.

- [ ] **Step 2: Request focused reviews**

Review shell/public containment separately from dashboard/editor behavior. Resolve every Critical and Important finding. The admin review must compare all desktop guards/actions with mobile card actions; the public review must check accessible compact navigation and content containment.

- [ ] **Step 3: Perform Brave responsive smoke checks**

Using the existing Brave installation and no downloaded browser, inspect 320, 375, 430, 768 pixels and desktop. Cover Home, About, blog archive, an article with long content/tags, dashboard with full and empty queues, existing/new editor states, media controls, and dialogs.

For every surface, verify in DevTools:

```js
document.documentElement.scrollWidth === document.documentElement.clientWidth
```

Confirm all controls remain reachable, header/footer text is legible, focus is visible, desktop behavior is unchanged, and editor redirects still replace the route after successful terminal actions.

- [ ] **Step 4: Update OpenSpec only from observed evidence**

Add responsive requirements and tasks. Check Task 3.4 only after its automated and manual public checks pass. Check Task 6.4 only after public archive/navigation and redirect smoke evidence is complete. Keep Task 8.4 open unless tag creation/deletion and article-chip smoke checks were actually performed.

- [ ] **Step 5: Request authorization for the verification documentation commit**

Stop and present the exact staged scope and message:

```text
docs(blog): Verifies responsive archive surfaces
- Extends public and admin responsive requirements and implementation decisions
- Records automated validation, focused review, and Brave viewport evidence
- Preserves unchecked staging tasks that still lack direct observation
```

- [ ] **Step 6: Stop before sync or archive**

Do not synchronize or archive until every remaining task is complete and the user explicitly authorizes both operations. When archiving, synchronize both delta specs into their main specs first.
