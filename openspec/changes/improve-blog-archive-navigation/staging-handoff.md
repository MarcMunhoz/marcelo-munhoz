# Staging Handoff

This handoff records verified local behavior and the checks that remain pending. It does not claim that a deployed staging environment was tested.

## Implemented Behavior

- The public blog index accepts normalized `page`, `q`, `year`, and `tag` state, presents three recent highlights on the unfiltered first page, and paginates the archive at 12 items per page.
- The canonical `/blog` query omits defaults, normalizes unsupported values, and remains available as browser-restorable archive state.
- The year filter loads only distinct publication years from the independent bounded `/api/contentful/blog-years` contract; tag filter labels omit decorative hash prefixes.
- Public article URLs remain clean. A browser-local history-state value carries the internal archive return URL, with `/blog` as the safe fallback.
- Article navigation exposes minimal previous and next links in global editorial chronology, using `fields.createAt` with `sys.createdAt` as fallback and tie-breaker.
- Legacy `/blog/tags/:tag` routes redirect to `/blog?tag=...`.
- Successful terminal editor actions replace the editor route with `/admin`; rejected actions remain in the editor.
- Owners can list, create, and delete editorial tags from a dedicated admin area. The list shows article usage counts without embedding article results, hides reserved language tags, and requires two confirmations before deleting an unused tag.
- Tag deletion revalidates references across all entry content types and assets with strict bounded responses before issuing a versioned delete; uncertain, stale, or conflicting provider state fails closed.
- Article-table tag chips toggle the existing tag filter, preserve unrelated filters, and expose selected state visually and accessibly.
- Author profiles accept a public Gravatar slug or profile URL and an optional allowlisted HTTPS fallback. The server stores a canonical hash without raw email or Identity data, while admin and public consumers fall through from Gravatar to fallback to initials.
- Unchanged legacy author photos retain their original Contentful value. The profile form identifies the photo source currently displayed, including image-error fallbacks; its reset action remains available for broken configured photos and clears only the blog photo settings. The form also documents square-image dimensions and efficient formats.
- Tag-management visibility badges and article counts are centered; destructive-action guidance remains separate from its icon.
- Routes marked as administrative do not render the public cookie notice; visiting them does not dismiss a notice that remains pending for public routes.

## Local Automated Verification

- `rtk docker compose exec -T app node --test --test-reporter=spec tests/blogNavigationRoundTrip.test.js`: 1 test passed in 1 suite; 0 failed.
- `rtk docker compose exec -T app node --test --test-reporter=spec tests/contentfulManagementFacade.test.js tests/adminFrontend.test.js`: 98 focused tests passed in 2 suites; 0 failed.
- `rtk docker compose exec -T app node --test --test-reporter=spec tests/authorPhotos.test.js tests/adminFrontend.test.js`: 77 focused tests passed in 2 suites; 0 failed.
- `rtk docker compose exec -T app node --test --test-reporter=spec tests/routingConfiguration.test.js`: 17 focused tests passed in 1 suite; 0 failed.
- `rtk docker compose exec -T app npm test`: 288 tests passed in 16 suites; 0 failed, cancelled, skipped, or pending.
- `rtk docker compose exec -T app npm run lint`: exited successfully with no lint diagnostics.
- `rtk docker compose exec -T app npm run build`: production SPA build succeeded; the summary contained 40 JavaScript and 9 CSS assets.
- `rtk docker compose exec -T app npm run scan:build-credentials`: exited successfully and reported no credential pattern.
- `rtk openspec validate improve-blog-archive-navigation --strict`: the active change is valid.
- Strict per-spec validation succeeded for all three main specs.
- `rtk git diff --check`: exited successfully with no output.

## Local Smoke Evidence

The backend Node process was restarted independently without recreating Compose or invoking package installation. The local health endpoint and `/api/contentful/blog-years` returned HTTP 200; the years payload passed shape validation and contained six distinct values. Brave headless captures at desktop and mobile widths showed the expected responsive control, highlight, and archive-row layouts without horizontal overflow or overlap. The persistent consent modal dimmed the captures, and the isolated DevTools port prevented an interactive focus/select check, so responsive interaction remains pending. The deterministic cross-layer test exercised the real exported archive-state helpers and public Contentful handler with a bounded fake client, covering the canonical archive query, selected article slug, clean article route, browser-local return state, article lookup, and older/newer navigation.

## Pending Manual Checks

- Inspect the archive at desktop and mobile widths, including highlight count, non-duplication, compact rows, long content, labelled controls, focus states, pagination, empty state, error/retry state, and absence of overlap.
- Confirm filter changes and browser Back/Forward restore the expected URL, controls, results, and scroll position.
- Confirm archive return behavior from an article and the direct-article `/blog` fallback.
- Confirm oldest and newest article boundaries expose only the available chronological direction.
- Confirm successful terminal admin actions return to `/admin` and failed actions retain editor state.
- As an owner, create an editorial tag, confirm its list metadata and zero count, cancel each deletion confirmation independently, then accept both confirmations and confirm the row refreshes away.
- Confirm a tag assigned to an article cannot be deleted, displays actionable guidance, and becomes deletable only after its references are removed; repeat with any non-article or asset reference available for safe testing.
- As a writer, confirm `/admin/tags` returns to `/admin`; as an owner, click and keyboard-toggle article tag chips and confirm only the tag filter changes.
- Open an admin route with public consent still pending, confirm the cookie notice is absent, then return to a public route and confirm it remains pending.
- Save an author profile with a public Gravatar slug, confirm the preview/account menu/public author page use the current avatar, and confirm no email is requested.
- Exercise a Gravatar profile without an avatar, an allowlisted fallback URL, a broken fallback, an unchanged legacy photo, and `Use initials instead`; confirm the displayed source follows each fallback, the order ends in initials without a broken image, and the external Gravatar profile or original image is unchanged.
- Deploy the intended branch and repeat public index, search, filters, history, clean article URL, chronological navigation, legacy tag redirect, and terminal admin redirect checks in staging.

The responsive checklist item and staging verification item remain open until these checks are performed against the appropriate runtime.

## Rollback And Safety

- The change introduces no content-model migration and does not mutate provider content or admin data.
- Public endpoints remain read-only and public error payloads are sanitized.
- Browser-local return state is optional and always has the safe `/blog` fallback.
- Rollback can restore the previous public list and route behavior without data migration.
- Do not synchronize or archive this OpenSpec change until manual and deployed checks are complete and separately authorized.

## Sanitization

This document intentionally excludes local absolute paths, usernames, machine or container identifiers, deploy URLs, provider entry identifiers, tokens, credentials, environment values, and raw provider diagnostics.
