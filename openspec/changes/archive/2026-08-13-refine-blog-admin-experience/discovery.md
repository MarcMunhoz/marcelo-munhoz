## UX Baseline

Current owner and writer admin screenshots show the same structural problems:

- The topbar session block repeats preview role text and uses a shield icon that implies a security state rather than a user account.
- The public `Admin` navigation entry does not surface the current user, role, or sign-out affordance.
- The sidebar mixes dashboard navigation with table filter shortcuts, duplicating filters already available in the body and implying sections that are not distinct destinations.
- Dashboard cards, article table, owner review queues, and article editor are all present in one broad page, so editing an article silently populates a form elsewhere on the screen.
- Article date and author values are rendered from implementation fields. Current examples include raw ISO timestamps and Contentful author entry IDs.
- Status and tag presentation is visually underdeveloped; status badges are not consistently aligned and tags are plain text.
- The editor exposes technical fields such as author entry ID, thumbnail public ID, and thumbnail URL.
- The media library can appear empty without explaining whether there are no assets, the folder is wrong, configuration is missing, or upstream loading failed.

## Current Code Map

- `app/src/pages/Admin.vue`
  - Owns the admin shell, sidebar, topbar session block, status cards, article table, owner review queue, persistent editor form, media dialog, and delete dialog.
  - Uses `articleColumns` with raw `createAt`, `author`, and `tags` fields.
  - Opens edit state by assigning `articleForm = articleToForm(article)` inside the same dashboard page.
  - Shows `thumbnailPublicId`, `thumbnailUrl`, `author`, and `tags` directly in the editor.
- `app/src/utils/adminAuth.js`
  - Builds Netlify Identity sessions in production-like environments.
  - Builds dev-only preview sessions from `admin.previewRole`.
- `app/src/utils/adminDashboard.js`
  - Owns current article summary, filtering, owner queue derivation, form hydration, action eligibility, and payload building.
  - This is the right first home for display normalization helpers.
- `app/src/utils/adminApi.js`
  - Owns client calls to server-side admin routes and user-safe API error mapping.
- `app/netlify/functions/contentfulAdminCore.js`
  - Owns server-side Contentful and Cloudinary facades, admin route authorization, and backend article normalization.
  - May need later refinement if display fields require richer resolved author or tag data.
- `app/tests/adminFrontend.test.js`
  - Main deterministic frontend coverage for admin helpers and source-level UI expectations.
- `app/tests/contentfulAdmin.test.js`
  - Backend admin route and Contentful admin read coverage.

## Focused Editor Decision

Use a right-side drawer for the first focused editor implementation.

Rationale:

- The current workflow is table-to-edit-to-return, and a drawer preserves dashboard context while making the editing surface explicit.
- A drawer is less disruptive than route restructuring for the first UX refinement pass.
- The drawer can still become route-addressable later if refresh resilience or deep links become important.

The drawer must have an explicit title, close action, dirty-state behavior if needed, and clear loading/save/error feedback. The persistent always-visible dashboard editor should be removed when the focused editor task is implemented.
