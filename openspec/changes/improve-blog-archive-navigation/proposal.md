## Why

The public blog cannot preserve archive state across navigation, its fixed three-item list does not scale, and readers have no reliable path between an article and the archive. Successful terminal editor actions also leave the editor open after the work is complete.

## What Changes

- Introduce a scalable hybrid public archive: automatic recent highlights plus a compact, paginated, searchable archive.
- Make the `/blog` query string the canonical state for archive page, search, year, and tag filters.
- Add clean article URLs, archive return behavior, and chronological previous/next article navigation.
- Return editors to `/admin` with route replacement after successful save, review submission, unpublication request, or owner unpublication actions.

## Capabilities

### New Capabilities

- `blog-public`: Public archive, article navigation, and safe public read API contracts.

### Modified Capabilities

- `blog-admin`: Terminal editor actions return to the dashboard only after a successful mutation.

## Impact

- Public Contentful read endpoints, query normalization, pagination, and chronological-neighbor lookups.
- Public blog and article routes, URL synchronization, browser-history restoration, responsive archive rendering, and accessible navigation.
- Admin editor terminal-action handling and route transitions.
- Automated tests for public API contracts, route behavior, archive states, article navigation, and admin redirects.
