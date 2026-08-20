## Context

The current public blog holds page state only in component memory, renders a fixed short list as large cards, and does not provide article-to-archive or chronological article navigation. The focused admin editor remains open after its terminal actions succeed.

This change implements the approved [Blog Archive And Article Navigation Design](../../../docs/superpowers/specs/2026-08-20-blog-archive-navigation-design.md). That document is the binding source for product and API behavior; this artifact records implementation decisions without redefining conflicting contracts.

## Goals / Non-Goals

**Goals:**

- Represent archive state canonically in `/blog` query parameters and restore it with browser history.
- Keep the first unfiltered archive useful with three automatic recent highlights while making the complete collection pageable and filterable.
- Provide clean article URLs, a safe archive return action, and globally chronological neighbors.
- Replace the editor route with `/admin` after confirmed terminal mutations.

**Non-Goals:**

- Manual featured-article curation, infinite scrolling, a new search service, Contentful field changes, editorial review-lifecycle changes, or ranking and recommendation work.

## Decisions

### Canonical Archive State And Bounded Public API

The frontend reads and writes `page`, `q`, `year`, and `tag` through Vue Router. Defaults are omitted and user filter changes reset the page to 1. The public index endpoint normalizes values before mapping them to allowlisted Contentful filters, and returns the normalized page so out-of-range URLs converge on a canonical valid URL.

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

## Risks / Trade-offs

- Filtering and pagination can produce invalid or stale query values: normalize them at the public boundary and synchronize the returned canonical page.
- Excluding highlights changes the unfiltered archive total: compute total and page count from the post-exclusion dataset on every unfiltered page.
- Neighbor lookups can fail independently from article loading: preserve readable article content and fail closed for navigation controls.
- A stored return URL is browser-local state: direct and shared article URLs must always retain `/blog` as a valid fallback.

## Migration Plan

1. Add the public index and article-navigation contracts with normalized, sanitized API responses.
2. Synchronize the `/blog` route state and introduce the hybrid archive layout.
3. Add article return and chronological-neighbor controls.
4. Apply successful terminal admin redirect behavior.
5. Verify automated coverage, responsive behavior, production build, credential scan, and strict OpenSpec validation.

Rollback can restore the current list route and editor post-mutation behavior because no content model migration is introduced.

## Open Questions

- None. The approved design supplies the required product and contract decisions.
