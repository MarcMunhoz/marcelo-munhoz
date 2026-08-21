# Blog Archive And Article Navigation Design

## Objective

Improve editorial and reading navigation without coupling the public blog experience to the ongoing Contentful locale and review-workflow changes.

The change has four outcomes:

- successful terminal actions in the article editor return to the admin dashboard;
- the public blog becomes a scalable hybrid of recent highlights and a compact searchable archive;
- article pages provide a reliable return path plus global chronological previous/next navigation.
- owners can manage article tags safely in the admin, and article tag chips become direct filters.

## Current Problems

- The admin editor remains open after save, review submission, unpublication request, or owner unpublication even though those actions complete the current task.
- The public blog keeps its page only in component memory. Browser history therefore loses pagination state after leaving and returning.
- The public API fixes article pages at three entries, and the public list renders every entry as a large fixed-width card.
- Article pages have no visible route back to the archive and no chronological continuation.
- Tag deletion requires Contentful access, tag usage is not summarized in the admin, and article-table tag chips do not apply the existing filter.

## Admin Editor Flow

After any of these successful actions, the editor replaces its current history entry with `/admin`:

- Save draft
- Submit for review
- Request unpublication
- Owner unpublish

The redirect happens only after the server confirms success. Failed actions remain in the editor and preserve the current form and error feedback.

`router.replace` is required instead of `router.push` so the browser Back button cannot reopen a stale editor state. Publication remains an owner action on the dashboard.

## Public Blog Information Architecture

### Recent Highlights

The three newest public articles in the global editorial chronology are selected automatically. Chronology uses `fields.createAt` descending with `sys.createdAt` descending as a stable tie-breaker. No new Contentful field or manual curation workflow is introduced.

Highlights appear only when all of these conditions hold:

- the current archive page is page 1;
- no text query is active;
- no year filter is active;
- no tag filter is active.

On desktop, the first article is the primary highlight and the next two are secondary highlights. On mobile, all three use a single vertical flow. Each highlight uses the real article image, title, date, and concise metadata.

### Compact Archive

The archive renders up to 12 articles per page as unframed compact rows rather than large cards. Each row contains:

- thumbnail;
- title;
- short description;
- author;
- publication date;
- tags.

For every unfiltered page, the three highlighted articles are excluded from the archive dataset and archive count. This keeps pagination stable and prevents a highlight from reappearing on a later page. With any filter active, highlights disappear and the archive searches the complete published collection.

### Archive Controls

The archive provides:

- text search;
- year selection;
- tag selection;
- pagination.

Changing search or filters resets the page to 1. Empty results retain the active controls and present a clear empty state.

The archive tag control excludes the reserved legacy language IDs `article-lang-pt-br` and `article-lang-en-us`. Article language is stored in the explicit editorial locale field, so these IDs are not reader-facing classifications.

## Admin Tag Management

An owner-only tag-management area lists non-reserved article tags with name, immutable Contentful ID, visibility, and article usage count. The count covers articles across editorial states and is informational; the page does not embed or duplicate the article list. Owners can create public tags using the existing creation contract. Tag renaming and bulk replacement are outside this change.

Deletion is unavailable while the article count is greater than zero. For an unused tag, deletion requires two sequential confirmations: one names the tag and explains the irreversible action, and the second asks the owner to confirm certainty immediately before the request. The server recalculates usage before deletion and returns a sanitized conflict if usage changed or Contentful still reports another reference.

In the article table, clicking a tag chip applies that tag to the existing tag filter and preserves all other active filters. The selected chip uses inverse foreground/background colors. Clicking the active tag chip again clears only the tag filter.

The reserved language IDs are omitted from public tag filters, article-editor choices, and the tag-management area even if an upstream environment still returns them.

## URL And History State

The `/blog` query string is the canonical archive state:

```text
/blog?page=4&q=architecture&year=2025&tag=ai
```

Supported keys are `page`, `q`, `year`, and `tag`. Defaults are omitted from the URL. Invalid values are normalized rather than forwarded to Contentful.

The page reads its initial state from the route, writes user changes back with Vue Router, and reloads whenever relevant query values change. Browser Back and Forward therefore restore the same archive page and filters.

Vue Router saved-position behavior restores scroll position for browser history navigation. Opening an article from the archive stores the current internal blog URL in history state while keeping the article's shareable URL clean.

## Article Reading Navigation

Every article page includes:

- a visible `All articles` action near the top;
- `Previous article` and `Next article` actions after the article body;
- the adjacent article title in each available action.

The sequence is global and chronological, independent of the filter or tag from which the reader arrived. The return action uses the stored internal blog URL when available and otherwise falls back to `/blog`.

At the oldest or newest boundary, the unavailable direction is omitted. Navigation failure does not prevent the article itself from rendering.

## Public API Contracts

### Blog Index

`GET /api/contentful/blog-index`

Accepted query parameters:

- `page`: positive integer, default 1;
- `q`: trimmed text with collapsed whitespace, limited to 100 characters;
- `year`: four digits from 1900 through 2100;
- `tag`: a public Contentful tag identifier containing 1-128 letters, digits, underscores, or hyphens.

Response shape:

```json
{
  "featured": [],
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 12,
  "totalPages": 1
}
```

The endpoint maps only allowlisted values to Contentful filters. It never accepts raw Contentful query keys. Unfiltered page 1 returns the highlights, while every unfiltered archive page excludes those entries from its count and items. Filtered responses return no highlights and include all matching articles.

When the requested page exceeds `totalPages`, the endpoint normalizes it to the last valid page and returns that page number. Empty collections use page 1 and `totalPages: 1`.

### Article Navigation

`GET /api/contentful/article-navigation/:slug`

Response shape:

```json
{
  "previous": { "title": "Older article", "slug": "older-article" },
  "next": { "title": "Newer article", "slug": "newer-article" }
}
```

Either property may be `null` at a collection boundary. `previous` means the immediately older article and `next` means the immediately newer article. The backend uses the same `fields.createAt`, then `sys.createdAt`, chronology as the blog index and returns no article body or private metadata.

## Error Handling

- A failed blog-index request shows an archive error state and retry action without discarding the URL state.
- A failed article-navigation request leaves the article readable and hides only previous/next navigation.
- A direct article URL always has a valid `/blog` fallback.
- Admin redirect occurs only after a successful mutation response.
- Tag deletion occurs only after zero usage is revalidated server-side and both client confirmations succeed.
- Tag deletion conflicts retain the tag and expose a safe actionable message without provider diagnostics.
- Public API error payloads remain sanitized and do not expose Contentful diagnostics or configuration.

## Accessibility And Responsive Behavior

- Search and filters have programmatic labels.
- Pagination exposes the current page and standard navigation semantics.
- Highlight and archive links have visible keyboard focus.
- Images preserve stable aspect ratios to prevent layout shifts.
- Long titles wrap without changing control dimensions or overlapping metadata.
- Mobile archive rows stack image and text while keeping primary navigation visible.

## Testing

Automated coverage must verify:

- each successful terminal editor action replaces the route with `/admin`;
- failed editor actions do not navigate;
- blog query parsing, normalization, and route synchronization;
- filter changes reset pagination;
- highlights appear only for the unfiltered first page;
- highlighted articles are not duplicated in the archive;
- archive pagination and out-of-range normalization;
- Contentful search, year, and tag query construction;
- chronological neighbors, stable ordering, and collection boundaries;
- return-to-list fallback and stored archive state;
- article rendering remains available when navigation loading fails;
- responsive markup and required accessible labels;
- owner-only tag-management authorization and article usage counts;
- both destructive confirmations, zero-usage revalidation, and stale-count conflicts;
- article-chip filter toggling, preserved unrelated filters, and inverse selected styling;
- reserved language-tag exclusion across public and admin choices;
- full unit suite, lint, production build, credential scan, and strict OpenSpec validation.

## Scope Boundaries

This change does not introduce:

- manual featured-article curation;
- infinite scrolling;
- a new search service;
- changes to Contentful article fields;
- changes to the editorial review lifecycle;
- tag renaming or bulk tag replacement;
- analytics-driven ranking or recommendations.
