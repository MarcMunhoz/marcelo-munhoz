# Staging Smoke Checks

Use this checklist only with disposable content and media. Do not publish or mutate real editorial content while validating the admin workflow.

## Preconditions

- Netlify Identity is enabled on the staging or deploy-preview site.
- The test user can sign in through Netlify Identity.
- Role metadata is configured for the test user as either owner or writer.
- Writer tests use an account whose metadata points to the matching Contentful author entry.
- Required Contentful and Cloudinary runtime configuration exists in the staging environment.
- Disposable Contentful entries and Cloudinary assets are clearly named for cleanup.

## Identity And Session

- Open `<staging-admin-url>` while signed out and confirm protected admin operations are unavailable.
- Sign in as the writer test user and confirm the header shows the user identity, writer role, and a sign-out action.
- Sign out, confirm the confirmation prompt appears, and verify admin state resets.
- Sign in as the owner test user and confirm the header shows the user identity, owner role, and a sign-out action.

## Admin API And Redirects

- Load the admin dashboard and confirm the articles request returns `200`.
- Confirm author names render as readable names, not raw Contentful entry IDs.
- Confirm dates render in a readable display format in the table and editor.
- Confirm unauthenticated admin Function access returns an authorization failure rather than content.
- Confirm unauthorized writer operations return an authorization failure without exposing raw diagnostics.

## Writer Flow

- Create a disposable draft as the writer.
- Save draft changes and reload the page.
- Reopen the disposable draft and confirm the saved fields, author display, tags, date, and thumbnail state are preserved.
- Submit the disposable draft for review.
- Confirm the writer cannot publish, archive, delete, or edit articles created by another author.

## Owner Flow

- Confirm the owner can see review queue items.
- Publish the disposable review item.
- Request or execute unpublication only where the current status allows that action.
- Archive a disposable article and record the moderation reason when the UI asks for one.
- Delete only disposable test content.
- Confirm the owner cannot edit another author's article body when trusted creator metadata does not match.

## Media Library

- Open the media library from the editor and confirm empty, loading, error, and populated states remain user-safe.
- Select an existing disposable asset and confirm the thumbnail preview updates.
- Upload a disposable image when upload is enabled.
- Confirm selected media saves to the article and reloads as a visual preview.
- Clean up disposable uploaded assets after the smoke test.

## Responsive Pass

- Repeat a quick owner dashboard pass at desktop and mobile widths.
- Repeat a quick writer dashboard pass at desktop and mobile widths.
- Confirm table controls, status badges, action buttons, and editor controls do not overlap.

## Evidence To Capture

- Test date.
- Test role.
- Disposable article slug or title prefix.
- Result for each section.
- Cleanup confirmation for disposable content and media.

## Current Handoff

See `staging-handoff.md` for the latest staging findings, implemented fixes, and remaining Cloudinary media-library diagnostics.
