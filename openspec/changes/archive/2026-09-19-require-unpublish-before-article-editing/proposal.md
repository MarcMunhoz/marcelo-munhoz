## Why

Published articles can currently be opened and saved as editable Contentful entries, which creates unpublished changes behind a still-live public version. Editing must instead begin from an explicit unpublish action so the editorial state and available actions remain unambiguous.

## What Changes

- Remove edit actions for articles whose authoritative lifecycle is published or has unpublished changes over a published version.
- Require owners to unpublish an article, or writers to request unpublication, before editing can begin.
- Block direct navigation and save attempts for live articles in both the admin frontend and the Contentful management boundary.
- Preserve normal editing for new, draft, review, and unpublished articles.
- Replace the existing publish-over-live workflow with an explicit unpublish, edit, review, and publish sequence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `blog-admin`: Restrict article editing to non-live lifecycle states and require an explicit unpublication step before a published article can be changed.

## Impact

- Admin dashboard action availability and article-editor routing.
- Editorial lifecycle utilities and user-facing blocked-state guidance.
- Contentful update handlers and facade safeguards.
- Component, unit, integration, and browser regression coverage for owner and writer workflows.

