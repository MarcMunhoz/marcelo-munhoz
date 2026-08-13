## 1. Discovery And UX Baseline

- [x] 1.1 Capture current owner and writer admin screens with the existing dev preview roles for dashboard, table, editor, review queue, and media library.
- [x] 1.2 Map current admin components, helpers, and tests that control session display, article normalization, action eligibility, editor state, and media state.
- [x] 1.3 Decide whether the focused editor will use routes, a drawer, or a modal before changing implementation.

## 2. Display Data Normalization

- [x] 2.1 Add deterministic tests for human-readable article dates in the admin table and review queues.
- [x] 2.2 Add deterministic tests for resolved author display names and fallback behavior that does not show raw entry IDs as primary UI.
- [x] 2.3 Add deterministic tests for tag display as structured labels or chips instead of raw comma-separated input in primary UI.
- [x] 2.4 Implement admin display normalization for dates, authors, tags, status labels, and thumbnail preview metadata.

## 3. Role And Action Semantics

- [x] 3.1 Add deterministic tests for writer action visibility across draft, review, published, unpublished, archived, and unpublication-requested states.
- [x] 3.2 Add deterministic tests for owner action visibility across draft, review, published, unpublished, archived, and unpublication-requested states.
- [x] 3.3 Update action eligibility helpers so writers request editorial actions and owners execute lifecycle actions directly.
- [x] 3.4 Update table and review queue action buttons, labels, icons, and tooltips to match role and article state.

## 4. Session And Navigation UX

- [x] 4.1 Add deterministic tests for authenticated owner and writer session display using name/email and role.
- [x] 4.2 Add deterministic tests for dev-only local preview state that does not mimic a real authenticated identity.
- [x] 4.3 Add sign-out controls with confirmation and authenticated-state reset behavior.
- [x] 4.4 Remove decorative or duplicate admin sidebar entries, or convert them into real destinations or clearly-scoped filters.
- [x] 4.5 Update public admin navigation so authenticated state can show user identity, role, and sign-out affordance when available.

## 5. Focused Article Editing

- [x] 5.1 Add deterministic tests for opening a new article editor from the dashboard.
- [x] 5.2 Add deterministic tests for opening an existing article editor from the table or review queue.
- [x] 5.3 Add deterministic tests for closing or leaving the editor and returning to a coherent dashboard or article list state.
- [x] 5.4 Move article editing into the selected focused surface without silently populating a persistent dashboard editor.
- [x] 5.5 Ensure editor loading, save, conflict, authorization, and validation states still use user-safe messages.

## 6. Editor Field UX

- [x] 6.1 Replace primary author entry ID editing with an author display control and safe fallback behavior.
- [x] 6.2 Replace primary thumbnail ID and URL fields with thumbnail preview and media selection controls.
- [x] 6.3 Replace primary tag ID string editing with structured tag chips, labels, or selectable controls.
- [x] 6.4 Keep technical IDs in internal state only where required for Contentful mutations and deterministic tests.

## 7. Media Library UX

- [x] 7.1 Add deterministic tests for media library loading, empty, configuration-error, upstream-error, and populated states.
- [x] 7.2 Render Cloudinary assets as a visual grid or list with thumbnail previews.
- [x] 7.3 Ensure selecting an asset updates the article thumbnail preview and hidden metadata used for saving.
- [x] 7.4 Ensure upload remains available when configured and media listing is empty.
- [x] 7.5 Keep Cloudinary credentials, raw diagnostics, and secret names out of user-visible media states.

## 8. Responsive And Visual Polish

- [x] 8.1 Verify the refined owner dashboard at desktop and mobile widths without overlapping text or controls.
- [x] 8.2 Verify the refined writer dashboard at desktop and mobile widths without overlapping text or controls.
- [x] 8.3 Align table status badges, action buttons, tags, and date/author columns consistently.
- [x] 8.4 Keep the admin visual language consistent with the current Quasar/site palette while removing scaffold-like UI.
- [x] 8.5 Restrict article editing to accounts that match trusted creator metadata while preserving owner moderation actions.

## 9. Validation And Staging

- [x] 9.1 Run the deterministic admin frontend and backend tests in the container context.
- [x] 9.2 Run lint, build validation, and frontend credential scanning in the container context.
- [x] 9.3 Run `openspec validate refine-blog-admin-experience --strict`.
- [x] 9.4 Document optional staging smoke checks for Netlify Identity login/logout, role metadata, admin Function redirects, Contentful operations, and Cloudinary listing/upload using disposable content.
- [x] 9.5 When production-like behavior must be verified, push to `staging` and complete the documented smoke checks before merging onward.
