## Why

The public blog cannot preserve archive state across navigation, its fixed three-item list does not scale, and readers have no reliable path between an article and the archive. Successful terminal editor actions also leave the editor open after the work is complete, while Contentful tags cannot be safely reviewed or removed from the admin area.

## What Changes

- Introduce a scalable hybrid public archive: automatic recent highlights plus a compact, paginated, searchable archive.
- Make the `/blog` query string the canonical state for archive page, search, year, and tag filters.
- Add clean article URLs, archive return behavior, and chronological previous/next article navigation.
- Return editors to `/admin` with route replacement after successful save, review submission, unpublication request, or owner unpublication actions.
- Add owner-only tag management with article usage counts, safe deletion, and tag-chip filtering from the article table.
- Exclude reserved legacy article-language tags from public and administrative tag choices.
- Let authors prefer a public Gravatar profile for their photo, with an allowlisted HTTPS fallback and initials when neither image is usable.
- Keep the public cookie notice out of authenticated administrative routes without accepting consent on the user's behalf.
- Keep the global shell, Home, About, articles, and consent notice contained and accessible at the existing 700-pixel public breakpoint.
- Adapt the dashboard, complete article actions, focused editor, and media dialog at the existing 720-pixel admin breakpoint while preserving desktop presentation.
- Hide administrative discovery from signed-out navigation and search crawlers, and reveal Netlify Identity only through the three-click `AMIGO` challenge.
- Replace ambiguous compact header icons with one labelled navigation menu and make tag deletion resilient to bounded Contentful rate limits.

## Capabilities

### New Capabilities

- `blog-public`: Public archive, article navigation, and safe public read API contracts.

### Modified Capabilities

- `blog-admin`: Terminal editor actions return to the dashboard only after a successful mutation, and owners can manage article tags safely.

## Impact

- Public Contentful read endpoints, query normalization, pagination, and chronological-neighbor lookups.
- Public blog and article routes, URL synchronization, browser-history restoration, responsive archive rendering, and accessible navigation.
- Admin editor terminal-action handling, route transitions, article-list tag interaction, and tag-management APIs.
- Author-profile photo resolution, safe Gravatar lookup, fallback rendering, and photo guidance.
- Responsive public and administrative composition without a new framework or hidden mobile workflows.
- Automated tests for public API contracts, route behavior, archive states, article navigation, admin redirects, and responsive structural contracts.
