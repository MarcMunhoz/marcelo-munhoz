## Context

The first blog admin change established the secure foundation: Netlify Identity-backed authorization in production, a dev-only preview role, server-side Contentful Management API operations, Cloudinary media routes, and real dashboard data. The remaining problem is experience quality. The current `/admin` page exposes implementation details, mixes multiple workflows in a single vertical surface, and makes role/status actions hard to understand for both owner and writer profiles.

The next change should preserve the backend security boundary while reshaping the admin UI into a focused CMS workflow. Owner and writer experiences share data and components, but they need different affordances: writers request review actions, owners execute publication lifecycle actions.

## Goals / Non-Goals

**Goals:**

- Make session state understandable by showing the authenticated user's name, role, dev preview state when applicable, and a functional logout path.
- Make navigation honest: every visible navigation item must either go somewhere meaningful or be removed.
- Make article list data readable: human dates, resolved author names, aligned status badges, visible tags, and no raw entry IDs in primary UI.
- Make article actions role-aware and status-aware for both writers and owners.
- Move article editing into a focused screen, route, drawer, or modal instead of silently populating a persistent editor elsewhere on the dashboard.
- Replace raw thumbnail IDs and URLs with thumbnail previews and admin-appropriate media controls.
- Make media library states explicit: loading, empty folder, configuration error, upstream error, and successful asset grid.
- Include a staging smoke check path for Netlify Identity and real provider behavior before merge.

**Non-Goals:**

- Replacing Contentful, Cloudinary, Netlify Identity, or the current server-side admin API architecture.
- Granting guest writers broad Contentful Editor access.
- Adding analytics/page-view metrics.
- Building a full multi-section CMS if the current admin only needs dashboard, article editing, review, and media selection.
- Changing public blog read routes or public article rendering behavior except where admin data normalization needs shared helpers.

## Decisions

### Use One Coherent Admin Information Architecture

The current sidebar should not remain decorative. The implementation should either remove it or turn it into real navigation with meaningful destinations. A pragmatic first pass is:

```text
Dashboard
  -> article table, status cards, owner review summaries

Article editor
  -> opened explicitly for New/Edit in a focused route/drawer/modal

Media picker
  -> opened from the editor as a visual picker
```

Rationale: a sidebar that merely toggles filters duplicates controls already present in the table and makes the UI feel broken. A smaller top-level structure is better than fake navigation.

Alternative considered: keep sidebar and make Drafts/Review filter shortcuts. This is acceptable only if the UI makes them look like filter shortcuts rather than application sections.

### Separate Selection From Editing

Clicking edit should open a focused editing surface and make the transition obvious. Acceptable patterns are:

- route-based editor, such as `/admin/articles/:id` and `/admin/articles/new`
- right-side drawer with explicit title and close action
- modal editor only if the form remains comfortable on desktop and mobile

Rationale: silently filling a form below the table feels accidental and makes users lose context. A focused editing surface also lets the dashboard remain scannable.

Recommendation: use route-based editor if deep-linking and refresh resilience are important; use a drawer if the fastest editorial loop is table-to-edit-to-return.

### Normalize Display Data Before Rendering

The UI should receive or derive admin display fields such as:

- `displayDate`: human-readable date
- `authorName`: resolved author display name
- `statusLabel` and status color
- thumbnail preview URL
- display tag labels or at least tag chips
- action eligibility for the current role/status

Rationale: primary admin UI should not display `Author entry ID`, image IDs, raw URLs, ISO timestamps, or Contentful internals unless a troubleshooting/details panel is intentionally opened.

Alternative considered: keep raw fields in read-only inputs for transparency. Rejected for default UI because it exposes implementation details and makes common editing harder.

### Make Role Actions Semantic

Action labels and availability must follow this model:

```text
writer + draft/submission -> edit, submit for review
writer + published        -> request unpublication
owner + draft/review      -> edit, publish, archive/delete when eligible
owner + published         -> edit, unpublish, archive/delete when eligible
```

Owners execute lifecycle operations directly. Writers request owner review. Published articles should not show publication request actions.

Rationale: this preserves the authorization model and makes the UI match editorial language.

### Treat Dev Preview As Development State, Not Identity

In local development, the UI may show `Local preview` and the selected role, but it should not mimic a real authenticated user too strongly. In production-like environments, the UI should show the real Netlify Identity user name/email and role.

Rationale: the current "Owner preview / Owner preview" block with a shield looks like a security feature rather than local test state.

### Use Visual Media UX

The media area should show thumbnail previews and a visual library grid. Raw Cloudinary IDs and URLs can remain in internal state and tests, but not as primary editor controls. Empty and error states should explain what happened without exposing credentials.

Rationale: article image selection is visual work. A text-only ID/URL display is not usable for normal authoring.

## Risks / Trade-offs

- More focused editor navigation can require router or state restructuring -> Keep the first pass limited to article list, editor open/close, and refresh-safe form hydration.
- Resolving author names may require richer Contentful read handling -> Add deterministic tests and avoid arbitrary browser-controlled Contentful queries.
- Hiding raw IDs can make debugging harder -> Provide developer-safe diagnostics in tests or optional internal details, not primary UI.
- Media library may be empty because of folder configuration or because no assets exist -> Distinguish empty, configuration error, and upstream failure states.
- Staging tests can mutate real Contentful data -> Use disposable test entries/assets and document cleanup expectations.

## Migration Plan

1. Add tests for the intended owner and writer admin presentation before changing UI behavior.
2. Refactor display normalization helpers for dates, authors, tags, thumbnails, and role/status action eligibility.
3. Reshape session controls and navigation.
4. Move article editing to an explicit focused surface.
5. Replace technical editor fields with admin display controls and previews.
6. Improve media library states and thumbnail selection.
7. Validate locally with deterministic tests and lint/build.
8. Push to `staging` when production-like validation is needed, then smoke test Netlify Identity, Functions, Contentful, and Cloudinary before merging onward.

## Open Questions

- Should the focused editor be route-based, a right-side drawer, or a modal?
- Should owners assign the author explicitly during review, or should writers select only an allowed author profile?
- Should tags display Contentful tag IDs, human labels, or both in a secondary details view?
