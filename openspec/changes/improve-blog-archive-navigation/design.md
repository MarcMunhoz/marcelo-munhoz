## Context

The current public blog holds page state only in component memory, renders a fixed short list as large cards, and does not provide article-to-archive or chronological article navigation. The focused admin editor remains open after its terminal actions succeed.

This change implements the approved [Blog Archive And Article Navigation Design](../../../docs/superpowers/specs/2026-08-20-blog-archive-navigation-design.md). That document is the binding source for product and API behavior; this artifact records implementation decisions without redefining conflicting contracts.

## Goals / Non-Goals

**Goals:**

- Represent archive state canonically in `/blog` query parameters and restore it with browser history.
- Keep the first unfiltered archive useful with three automatic recent highlights while making the complete collection pageable and filterable.
- Provide clean article URLs, a safe archive return action, and globally chronological neighbors.
- Replace the editor route with `/admin` after confirmed terminal mutations.
- Let owners review article-tag usage and delete unused tags without opening Contentful.
- Make article-table tag chips directly apply the existing tag filter.

**Non-Goals:**

- Manual featured-article curation, infinite scrolling, a new search service, Contentful field changes, editorial review-lifecycle changes, tag renaming, bulk tag replacement, or ranking and recommendation work.

## Decisions

### Canonical Archive State And Bounded Public API

The frontend reads and writes `page`, `q`, `year`, and `tag` through Vue Router. Defaults are omitted and user filter changes reset the page to 1. The public index endpoint normalizes values before mapping them to allowlisted Contentful filters, and returns the normalized page so out-of-range URLs converge on a canonical valid URL.

The year control loads independently from a dedicated public endpoint. That endpoint performs one date-only Contentful query with an explicit 1000-entry limit and returns distinct years in descending order. If the reported collection exceeds the bound or the response is incomplete or malformed, it fails closed with a sanitized error rather than claiming that a partial list contains every available year.

Alternative considered: retain archive state in component memory. That would preserve neither shareable filtered URLs nor Back and Forward restoration.

### Stable Hybrid Dataset

The backend derives highlights from global chronology using `fields.createAt` descending with `sys.createdAt` descending as the tie-breaker. On every unfiltered archive page it excludes those three entries from both archive items and archive count; filtered requests omit highlights and include all matches. This prevents duplication and pagination drift.

Alternative considered: exclude highlights only from the first archive page. That would allow a highlight to reappear later and make archive totals unstable.

### Article Return And Neighbor Loading

Article routes remain shareable and clean. The archive stores the internal blog URL in history state before navigation, while the article reads it only as a return hint and otherwise falls back to `/blog`. Neighbor loading is independent from article rendering so a failed lookup hides only previous/next controls.

Alternative considered: append the return archive query to article URLs. That would make shared article URLs carry private navigation context and would not improve direct-link behavior.

### Terminal Admin Redirects

Save draft, submit for review, request unpublication, and owner unpublish call `router.replace('/admin')` only after their mutation resolves successfully. Failure leaves the editor state, values, and error feedback in place.

Alternative considered: use `router.push('/admin')` or redirect before the response. Push permits reopening stale editor state with Back, while an optimistic redirect discards actionable failure feedback.

The application-level analytics consent dialog is not mounted while the active route carries `requiresAdmin`. Hiding it does not mutate the pending consent state, so public routes continue to request consent until the visitor dismisses the notice.

### Owner Tag Management And Article Filtering

The admin provides an owner-only tag-management area that lists each non-reserved article tag with its stable Contentful ID, visibility, and article usage count. Counts include editable articles across editorial states but do not expand the management area into an article browser. Existing tag creation remains available; renaming and bulk replacement are out of scope.

Deletion is available only when the displayed article count is zero. It requires two sequential confirmations: the first identifies the tag and irreversible action, and the second asks the owner to confirm certainty immediately before the request. The server revalidates global entry and asset references and maps any Contentful refusal to a safe conflict response, preventing stale counts or non-article references from producing an unsafe success state.

In the existing article table, activating a tag chip applies that value to the current tag filter without clearing unrelated filters. The active tag uses the inverse chip colors shown by other selected admin actions; activating it again clears the tag filter.

The reserved legacy IDs `article-lang-pt-br` and `article-lang-en-us` are never offered as public archive filters, article-editor choices, or manageable editorial tags. Article language continues to come from the explicit editorial locale field.

### Gravatar-First Author Photos

The author profile accepts a public Gravatar profile slug or URL and an optional HTTPS fallback URL from an explicit image-host allowlist. It never derives the public photo from Netlify Identity or stores a raw email address. The server resolves public profile slugs while saving, stores the canonical hash in the existing photo object, and public clients build a stable 192-pixel, G-rated Gravatar URL that returns 404 when no avatar exists.

Image consumers try Gravatar first, then the configured fallback, then the existing initials treatment. This keeps later Gravatar photo changes live without another Contentful save while preserving legacy string, Contentful Asset, and Cloudinary-style photo values. The form recommends a centered square image, ideally 512 by 512 pixels and at least 256 by 256 pixels, using an efficient photographic format or PNG when transparency is required.

The profile editor labels the source of the candidate currently visible rather than only the first configured source, so image-error fallback remains understandable. Its reset action is described as `Use initials instead`, or `Keep initials and clear photo settings` after configured images fail, and explicitly states that it clears only the blog configuration, never the external Gravatar profile or original image.

### Responsive Public And Administrative Composition

Public surfaces retain the existing 700-pixel compact breakpoint. The global shell keeps icon controls with stable accessible names and bounded menus, footer and consent content wrap within the viewport, and Home, About, article media, tags, Markdown, code, and tables remain contained without document-level horizontal overflow. Desktop labels and composition remain available above the breakpoint.

Administrative surfaces retain the existing 720-pixel compact breakpoint. The dashboard switches the article table to full-width cards that expose the same metadata, authorization guards, lifecycle actions, tag-filter behavior, and article-specific loading feedback as desktop rows. Metrics collapse only when their readable width requires it, while filters, status tabs, review queues, and actions remain reachable.

The focused editor removes min-content width constraints from its card and Markdown controls, separates formatting and mode actions, stacks fields and workflows, and bounds the media dialog by the viewport with internal scrolling. Keyboard focus receives an explicit visible outline that stays inside phone-width edges. These adaptations do not change editor mutations, validation, routing, or desktop behavior.

Responsive source-contract tests protect the breakpoints, accessibility labels, action parity, and containment rules. Manual Brave checks cover 320, 375, 430, and 768 pixels plus desktop; data-rich dashboard and media states may be simulated in browser memory for layout checks without writing provider data. Real provider workflows and deployed behavior remain staging responsibilities.

## Risks / Trade-offs

- Filtering and pagination can produce invalid or stale query values: normalize them at the public boundary and synchronize the returned canonical page.
- Excluding highlights changes the unfiltered archive total: compute total and page count from the post-exclusion dataset on every unfiltered page.
- Neighbor lookups can fail independently from article loading: preserve readable article content and fail closed for navigation controls.
- A stored return URL is browser-local state: direct and shared article URLs must always retain `/blog` as a valid fallback.
- Tag counts can become stale between display and deletion: revalidate on the server and fail with a safe conflict instead of deleting.
- Contentful can retain references outside active articles: surface the provider refusal without exposing diagnostics and leave the tag intact.
- Gravatar lookup or image delivery can fail independently: reject unresolved profile saves safely, keep the previous Contentful version, and fall back without displaying a broken image.
- Framework cascade and intrinsic minimum widths can defeat compact rules: use explicit breakpoint overrides and reset min-content constraints at the owning component boundary.
- A mobile-only presentation can drift from desktop authorization behavior: route both table rows and cards through the same guards and handlers.

## Migration Plan

1. Add the public index and article-navigation contracts with normalized, sanitized API responses.
2. Synchronize the `/blog` route state and introduce the hybrid archive layout.
3. Add article return and chronological-neighbor controls.
4. Apply successful terminal admin redirect behavior.
5. Add owner tag management, clickable article tags, reserved-tag filtering, and destructive-action safeguards.
6. Verify automated coverage, responsive behavior, production build, credential scan, and strict OpenSpec validation.

Rollback can restore the current list route and editor post-mutation behavior because no content model migration is introduced.

## Open Questions

- None. The approved design supplies the required product and contract decisions.
