## Why

The first admin pass made the workflow functional, but the editing experience still feels like a technical dashboard instead of a focused editorial tool. The next change should turn the admin into a coherent CMS experience for both owner and writer profiles while keeping Netlify Identity separate from the public author profile stored in Contentful.

## What Changes

- Replace the rough authenticated user menu with a compact account menu that shows the signed-in user's display name, role, session state, and sign-out action without requiring a photo.
- Add an author profile workflow backed by Contentful author entries, separate from Netlify Identity account data.
- Allow author profile photos to be optional.
- Make public article bylines link from the author name to author information.
- Move new article and edit article workflows to focused pages instead of dashboard-side editing surfaces.
- Keep article editing scoped to the creator while preserving owner moderation capabilities for other authors' content.
- Persist article creation and update timestamps from the admin workflow with timezone-safe instants so the intended editorial date is not shifted by author location or deployment timezone.
- Render public article bylines with locale-appropriate labels and display dates only, showing an updated date only when the article was edited on a different calendar day.
- Let admins interact with existing article images visually, including selecting, replacing, and editing image variants where supported.
- Evaluate and integrate Cloudinary's Media Editor or Upload Widget where it fits the admin image-editing workflow without exposing secrets.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `blog-admin`: Improve admin account, author profile, article editor, public author byline, and image editing requirements.

## Impact

- Admin frontend routes and state for account menu, author profile editing, article create/edit pages, and media interactions.
- Public blog article rendering for clickable author bylines and author information pages or sections.
- Contentful author data access and update flows through authenticated admin APIs.
- Cloudinary media selection and optional editing integration, including client widget loading and server-side credential boundaries.
- Tests for role-specific editing permissions, author profile rendering, route navigation, and image workflow states.
