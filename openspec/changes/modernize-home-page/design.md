## Context

The Home page is implemented in the public SPA as a single page with a Cloudinary-generated hero, dynamic experience facts, a tool icon collection, and project links. Its current copy is paragraph-heavy and its visual hierarchy scales poorly on compact screens. The supplied Cloudinary asset should become the primary hero image without introducing a new image dependency or changing the global shell.

## Goals / Non-Goals

**Goals:**

- Establish a short, editorial first impression that identifies Marcelo and his work immediately.
- Keep the current personal/cultural voice and existing dynamic data sources.
- Make the hero, facts, knowledge, and projects readable at desktop and compact widths.
- Preserve accessible names, meaningful image alternative text, keyboard navigation, and existing routes.

**Non-Goals:**

- Redesign About, Blog, the global header, or administrative pages.
- Add a CMS, API, new runtime dependency, or new analytics.
- Generate or edit the supplied image asset.

## Decisions

- **Use the supplied Cloudinary URL as the hero source.** The page will reference the exact asset and retain a bounded hero container with `object-fit: cover`; `object-position` remains adjustable if visual inspection shows the focal point needs correction. A local copy is not introduced.
- **Use an editorial hierarchy instead of a dashboard-like grid.** The page will lead with name/role and concise supporting copy, then show compact facts, grouped knowledge, and project links. This follows the clarity of the supplied reference sites while preserving the existing “Projetos (in)úteis” personality.
- **Keep dynamic experience values.** The existing year-count logic remains the source for time-based facts, avoiding stale hard-coded values. The facts are reformatted, not removed.
- **Prefer semantic links and labelled groups over icon-only affordances.** Knowledge items retain their existing data and icons but expose visible labels or accessible text. Projects remain real links with their current destinations and tooltips/descriptions.
- **Use CSS layout primitives already present in the project.** Responsive grid/flex rules and the existing compact breakpoint are preferred over new layout libraries. Typography uses bounded fluid sizes so mobile does not inherit oversized desktop headings.
- **Treat copy as content, not styling.** The implementation will keep the approved Portuguese positioning text in the component and avoid embedding long prose in CSS or image overlays.

## Risks / Trade-offs

- **[Hero focal point may crop differently]** → Keep the container dimensions close to the current layout, inspect the supplied image at desktop and compact widths, and adjust only `object-position` if needed.
- **[Shorter copy may omit context]** → Retain explicit experience, location, technical focus, and cultural interests in separate concise blocks.
- **[More visible project labels increase page length]** → Use a compact editorial list/grid and avoid repeating verbose tooltips as visible copy.
- **[Existing static responsive tests encode old class names]** → Update tests to assert behavior and semantic structure rather than brittle wording or incidental class names.

## Migration Plan

1. Update the Home component structure, copy, hero source, and local responsive styles.
2. Update public responsive tests and add assertions for the new hierarchy and image source.
3. Run the existing unit/lint/build checks and inspect the Home page at desktop and compact widths.
4. Rollback is a single revert of the Home component and its tests; no data migration is required.

## Open Questions

- Confirm final Portuguese wording during visual review; the structure should not depend on exact phrasing.
- Confirm whether all existing projects remain visible in the first viewport or whether the list should intentionally continue below the fold.
