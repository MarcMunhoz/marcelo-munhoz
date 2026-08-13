## 1. Admin Shell And Account Menu

- [x] 1.1 Replace the rough authenticated user dropdown with a compact account menu showing display name, role, signed-in state, and sign-out.
- [x] 1.2 Ensure the account menu renders cleanly without a profile photo and works for owner, writer, and local preview sessions.
- [x] 1.3 Add sign-out confirmation and verify the admin returns to the unauthenticated state after logout.

## 2. Author Identity Mapping

- [x] 2.1 Audit the current Netlify Identity user data, Contentful Author schema, and existing owner fallback mapping without reading local secret files.
- [x] 2.2 Define and implement the trusted Identity-to-Author mapping field or fallback strategy.
- [x] 2.3 Update article list and editor author resolution to use the trusted mapping consistently.
- [x] 2.4 Add tests for resolved author, missing author, and legacy owner fallback states.

## 3. Author Profile Workflow

- [x] 3.1 Add authenticated admin API endpoints to read and update the current user's Contentful Author profile.
- [x] 3.2 Build an admin author profile page for public fields such as name, biography, optional photo, and author slug.
- [x] 3.3 Keep Netlify Identity account fields separate from Contentful public author profile edits.
- [x] 3.4 Add user-safe unresolved-profile and save-error states.

## 4. Public Author Information

- [x] 4.1 Make article byline author names link to public author information when an author is resolved.
- [x] 4.2 Build the public author information view or section with name, biography, optional photo, and authored article context where available.
- [x] 4.3 Ensure public author rendering never exposes Identity e-mail, roles, invite state, or internal account identifiers.
- [x] 4.4 Add tests or fixtures for byline links and author pages with and without photos.

## 5. Dedicated Article Editor Pages

- [x] 5.1 Add route-level article creation and editing surfaces such as `/admin/articles/new` and `/admin/articles/:entryId/edit`.
- [x] 5.2 Move the current article form workflow from the dashboard surface into the focused editor pages.
- [x] 5.3 Preserve dashboard list, queue, and filter behavior as navigation into the editor pages.
- [x] 5.4 Add unsaved-change protection and coherent return navigation from editor pages.

## 6. Creator-Scoped Editing And Owner Moderation

- [ ] 6.1 Enforce edit button visibility and save authorization only for articles created by the signed-in author.
- [ ] 6.2 Preserve owner moderation actions for other authors' articles without allowing owner body edits.
- [ ] 6.3 Add tests for owner-created, writer-created, other-author, published, draft, and review-state action matrices.
- [ ] 6.4 Document the moderation boundary for owner actions and future feedback-wall work.

## 7. Visual Image Workflow

- [ ] 7.1 Make existing article thumbnail previews actionable for image replacement and supported edit actions.
- [ ] 7.2 Hide raw Cloudinary IDs and URLs from primary editor controls while keeping diagnostics intentional.
- [ ] 7.3 Keep media library selection visual and ensure selected assets update the article thumbnail preview.
- [ ] 7.4 Add fallback states for empty media, missing configuration, and upstream media failures.

## 8. Cloudinary Editing Integration

- [ ] 8.1 Evaluate Cloudinary Media Editor widget integration behind a small adapter loaded only when image editing is requested.
- [ ] 8.2 Implement widget configuration for supported existing-image edits without exposing Cloudinary secrets.
- [ ] 8.3 Decide whether edited images create a derived asset, update article transformation metadata, or store a new asset reference.
- [ ] 8.4 Validate Upload Widget and Media Editor behavior in staging before relying on either path as the primary editing workflow.

## 9. Verification

- [ ] 9.1 Run unit tests covering admin session controls, author mapping, profile APIs, editor routes, and action permissions.
- [ ] 9.2 Run build and credential scans to confirm Contentful and Cloudinary secrets are not bundled or exposed.
- [ ] 9.3 Smoke test staging with Netlify Identity login/logout, Contentful author profile data, article editing permissions, public byline links, and Cloudinary image workflows.
- [ ] 9.4 Update operational documentation for required Contentful author fields, Cloudinary permissions, and staging smoke steps.
