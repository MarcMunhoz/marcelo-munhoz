# Blog Admin And Archive Navigation Handoff

## Purpose

This document is the recovery point for continuing the blog work from another machine or CLI agent. It intentionally contains no local paths, machine identifiers, deploy URLs, credentials, tokens, Contentful entry IDs, or environment values.

## Branch And Repository State

- Working branch: `issue_49`.
- Remote branch: `origin/issue_49`.
- No dependency installation is required or authorized.
- Use the existing project container and prefix shell commands with `rtk`.
- Never read `.env` or other credential files.
- The active OpenSpec change is `improve-blog-archive-navigation`.
- The binding design is `docs/superpowers/specs/2026-08-20-blog-archive-navigation-design.md`.
- The implementation plan is `docs/superpowers/plans/2026-08-20-blog-archive-navigation.md`.

## Checkpoint Commits

Continue from these ordered checkpoints; do not amend or squash them:

1. `a24d7f0 fix(admin): Preserves article locale and publication state`
2. `583b648 fix(dev): Allows loopback origins in local middleware`
3. `cc210f7 docs(blog): Adds archive navigation design`
4. `0fee8e2 docs(blog): Adds archive navigation implementation plan`
5. `55be410 docs(openspec): Archives completed blog admin changes`
6. `1489d9a docs(blog): Adds archive navigation change`
7. `b3f4792 feat(admin): Returns completed editor actions to dashboard`
8. `335e0f1 feat(blog): Adds archive API and navigation groundwork`

The last commit deliberately says `groundwork`: `/blog-index` is complete, but
`/article-navigation/:slug` still has the equality defect documented below.

## Completed Earlier Work

The branch already contains committed work for:

- canonical PT/EN Article locale persistence through Contentful;
- localized-value reconciliation while the Article `locale` field remains localized;
- public byline language fallback for legacy articles, including `what-id-learned-last-years`;
- Contentful changed-entry lifecycle and `Publish changes` behavior;
- version-pinned `blogEditorialRequest` review state;
- writer ownership, lifecycle, and stale-version validation;
- local-development CORS support for loopback origins only.

The Contentful `blogEditorialRequest` content type was created manually with eight fields. `articleVersion` is a non-localized Integer; the other workflow fields are localized as documented by the archived changes.

## Archived OpenSpec Changes

The following changes were explicitly accepted as complete, synchronized to `openspec/specs/blog-admin/spec.md` in this order, and archived:

1. `refine-blog-admin-experience`
2. `improve-blog-admin-author-editor-ux`

Archive locations:

- `openspec/changes/archive/2026-08-20-refine-blog-admin-experience/`
- `openspec/changes/archive/2026-08-20-improve-blog-admin-author-editor-ux/`

After synchronization, all three main specs passed strict validation. Do not restore the active copies of these archived changes.

## Active Change Progress

### OpenSpec Contract: Complete

`improve-blog-archive-navigation` contains:

- a new `blog-public` capability delta;
- a `blog-admin` delta for terminal editor actions;
- explicit canonical URL behavior that omits default values;
- explicit rules hiding highlights after unfiltered page 1 while excluding the three featured entries from every unfiltered archive page.

The change passes strict OpenSpec validation.

### Admin Redirect: Complete And Reviewed

Successful editor actions now return to `/admin` using route replacement:

- Save draft;
- Submit for review;
- Request unpublication;
- Owner unpublish.

`runTerminalAdminAction` awaits the mutation, then local success-state work, then `router.replace("/admin")`. A rejected mutation exits before navigation. Executable tests cover success ordering and failure without redirect.

Review verdict: spec compliance approved; quality approved.

### Blog Index API: Complete And Reviewed

`GET /api/contentful/blog-index` now provides:

- allowlisted `page`, `q`, `year`, and `tag` inputs;
- collapsed and length-bounded search text;
- validated year and tag values;
- safe page bounds that cannot derive an imprecise or infinite Contentful `skip`;
- three automatic featured entries on canonical unfiltered page 1;
- a 12-item archive with the featured offset applied to every unfiltered page;
- filtered archive results without highlights;
- corrected out-of-range pages;
- sanitized public errors.

The final reviewed boundary is:

- maximum accepted page: `750599937895083`;
- derived unfiltered skip: `9007199254740987`, still a safe integer;
- the next page value normalizes to page 1 before Contentful is called.

Review verdict: spec compliance approved; quality approved.

### Article Navigation API: Incomplete

`GET /api/contentful/article-navigation/:slug` has been implemented provisionally with:

- `previous` as the immediately older article;
- `next` as the immediately newer article;
- effective chronology `fields.createAt || sys.createdAt`;
- `sys.createdAt` as tie-breaker;
- separate bounded candidate queries for dated and undated entries;
- minimal public `{ title, slug }` links;
- empty slug returning 404 before any Contentful call;
- sanitized errors and boundary `null` values.

Focused proxy and routing tests pass, but the task is not approved because one known equality case remains.

## First Required Fix On Resume

The undated candidate queries currently use strict `sys.createdAt[lt]` and `[gt]` bounds against the current effective date. That misses an undated candidate whose `sys.createdAt` exactly equals a dated current article's `fields.createAt`, even though the secondary key makes it a valid neighbor.

Reproduction shape:

```text
current dated article key:   (2026-06-10, 2026-06-20)
undated candidate key:       (2026-06-10, 2026-06-10)
expected relation:           candidate is immediate previous
current result:              previous is null
```

Implement the fix with TDD before starting frontend route state:

1. Add a failing mixed-data equality fixture to `app/tests/contentfulProxy.test.js`.
2. For a dated current article, include equality when querying undated candidates, then let the in-memory effective-key comparator select the valid direction.
3. Avoid returning the current article when the current article is itself undated. Conditional inclusive bounds or an explicit equality query are safer than globally replacing strict bounds.
4. Keep every Contentful query bounded and preserve the already-approved `/blog-index` behavior.
5. Run the complete proxy/routing suite, lint, and a scoped review.

The last review verdict for Task 4 was: spec compliance failed only for this equality case; quality needs one fix round.

## Tasks Not Started

Do not assume any implementation exists for:

- Task 5: canonical `/blog` query parsing, route synchronization, history state, and saved scroll;
- Task 6: three-item editorial highlights and compact 12-item archive layout;
- Task 7: visible return action, localized previous/next UI, and legacy tag-route redirect;
- Task 8: integrated contract test, full verification, responsive smoke, staging handoff, spec synchronization, and archive.

Follow the implementation plan task-by-task and keep the OpenSpec checklist synchronized with verified work only.

## Verification Evidence At Stop

Most recent checks after the provisional Task 4 fix:

- proxy and routing tests: 53 passed, 0 failed;
- project lint: passed;
- `git diff --check`: passed;
- strict active-change validation passed after the provisional Task 4 implementation;
- three main OpenSpec specs passed strict validation after the older changes were synchronized.

The full application suite, production build, credential scan, responsive browser checks, and staging smoke were not rerun after the new archive/navigation work. Run them in Task 8.

## Local Runtime Note

The frontend development server watches source changes, but `node middleware/server.js` does not watch backend files. After changing public middleware or Function core code, restart only the backend Node process inside the existing container. Do not recreate the Compose service merely to reload backend code because its startup command invokes `npm i`.

## Resume Commands

Use the existing container context:

```bash
rtk openspec list
rtk openspec validate improve-blog-archive-navigation --strict
rtk docker exec <app-container> node --test --test-reporter=spec tests/contentfulProxy.test.js tests/routingConfiguration.test.js
rtk docker exec <app-container> npm run lint
rtk git status --short
rtk git diff --check
```

Before declaring the active change complete, also run:

```bash
rtk docker exec <app-container> node --test --test-reporter=spec
rtk docker exec <app-container> npm run build
rtk docker exec <app-container> npm run scan:build-credentials
```

## Git And Publication Rules

- Preserve the detailed commit boundaries already present on `issue_49`.
- Do not amend or rewrite earlier commits.
- Ask for explicit authorization before each future commit.
- Push only through the configured HTTPS remote authenticated by the GitHub CLI credential helper.
- Synchronize the active OpenSpec delta specs before archiving the change.
