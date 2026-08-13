## Why

The blog admin area is technically functional, but the current experience still feels like an implementation scaffold: session state, navigation, article listing, review queues, editing, and media fields are visually mixed in ways that make both owner and writer workflows unclear. Refining the admin UX now will turn the secure admin foundation into a coherent CMS experience before additional editorial features are added.

## What Changes

- Replace the current role/session badge with a clearer authenticated user area that shows the user's name, role, local preview state when applicable, and a functional sign-out flow with confirmation.
- Rework admin navigation so sidebar items are either real destinations or removed in favor of clearer dashboard/table controls.
- Improve the article dashboard and table presentation for both owner and writer profiles, including human-readable dates, resolved author names, aligned status badges, and role/status-correct actions.
- Separate list/review workflows from article editing so opening an article does not silently populate an editor elsewhere on the page.
- Refine owner and writer action semantics: writers request editorial actions, while owners execute publication lifecycle actions directly.
- Replace technical editor fields such as author entry IDs, image IDs, and raw image URLs with admin-appropriate controls and visual previews.
- Improve media library and thumbnail selection states, including visible thumbnails, empty/error/loading states, and tag display/editing that does not require raw ID entry.
- Add explicit staging validation expectations for Netlify Identity, Functions, Contentful, and Cloudinary behavior when production-like behavior is needed before merging.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `blog-admin`: Refines admin session presentation, navigation, dashboard/table UX, article editing flow, role-specific actions, media handling UX, and staging validation expectations.

## Impact

- Affected frontend areas: admin shell, public admin navigation entry, session display, sign-in/sign-out controls, article dashboard, article table, owner review queue, article editor, media picker, thumbnail fields, author/tag controls, loading/empty/error states, and responsive layout.
- Affected server/runtime areas: may require admin read responses to include resolved author display names, thumbnail preview metadata, and action eligibility metadata without exposing credentials or arbitrary upstream query controls.
- Affected tests: deterministic frontend tests for owner and writer dashboards, table formatting, action visibility, editor navigation, media states, and dev preview behavior; backend tests if admin read payload normalization changes.
- Affected deployment validation: optional staging smoke checks should cover real Netlify Identity login/logout, role metadata, Functions redirects, Contentful reads/mutations, and Cloudinary media listing/upload behavior.
- Non-goal: this change does not replace the server-side authorization model or grant guest writers broad Contentful access.
