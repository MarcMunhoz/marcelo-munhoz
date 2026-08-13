## Context

The current admin can authenticate through Netlify Identity, read and mutate Contentful articles through server-side admin APIs, and list/select Cloudinary assets. The remaining problem is product shape: account controls are visually rough, article editing is mixed into the dashboard, author data is displayed inconsistently, and image controls expose implementation details instead of a visual workflow.

Netlify Identity remains the authentication source for e-mail, account identity, and roles. Contentful remains the editorial source for public author data such as name, biography, profile photo, and author-facing metadata. These two records may refer to the same person but MUST stay separate because Identity account fields are not the public author profile.

## Goals / Non-Goals

**Goals:**

- Make the admin account menu compact, readable, and role-aware for owner and writer sessions.
- Add a Contentful-backed author profile workflow with optional profile photo.
- Make article bylines link to author information on the public site.
- Move article creation and editing into dedicated pages.
- Keep edit permission tied to the article creator while preserving owner moderation controls.
- Improve image workflows with visual thumbnail interaction, replacement, and a path for Cloudinary widget-based editing.
- Keep Contentful and Cloudinary secrets server-side.

**Non-Goals:**

- Replace Netlify Identity.
- Build a custom image editor from scratch.
- Let owners rewrite another author's article body as part of moderation.
- Add multi-owner role management or collaborator invitations beyond the existing Identity role model.
- Redesign the entire public blog visual system.

## Decisions

### Separate Identity Profile From Author Profile

Netlify Identity will only answer "who is signed in and what role do they have". Contentful Author entries will answer "what public author information should readers see".

Implementation should resolve the current Identity user to a Contentful Author entry through a stable mapping, preferring explicit metadata when available and falling back only to already-supported legacy owner matching where necessary. Author profile edits will update the Contentful Author entry through an authenticated server endpoint.

Alternative considered: store public author profile data in Netlify Identity user metadata. That would couple public content to the auth provider, make Contentful author references less useful, and make article rendering dependent on Identity state.

### Use Focused Routes For Article Editing

Article creation and editing should move to route-level surfaces, for example `/admin/articles/new` and `/admin/articles/:entryId/edit`. The dashboard remains a list, queue, and navigation surface.

Alternative considered: keep the inline/dashboard editor and polish it. That keeps the confusing "click row, edit below" workflow and makes validation, unsaved-state handling, and mobile layout harder.

### Preserve Creator-Scoped Editing

Writers and owners may edit only articles with a trusted creator match to their account. Owner controls for other authors remain moderation actions: publish where appropriate, unpublish, archive, permanently delete, and eventually leave feedback or moderation notes.

Alternative considered: let owners edit every article. That weakens free-writing trust and blurs moderation with authorship.

### Treat Author Photo As Optional Media

Author profile photos are optional. The public author page and account menu must render professionally with only a name and role or biography.

Alternative considered: require every author to upload a photo. That adds friction and is not needed for the current solo/low-collaborator workflow.

### Integrate Cloudinary Widgets Instead Of Building Image Editing

Use the existing Cloudinary asset list for selection and evaluate Cloudinary's official Media Editor for editing existing images. The documented integration loads `https://media-editor.cloudinary.com/latest/all.js`, initializes `cloudinary.mediaEditor()`, configures `cloudName` and image `publicIds`, and opens the editor with `show()`. Supported image steps include resize/crop, overlays, text overlays, and export. Upload flows can continue through the Upload Widget when creating new assets, including signed upload and optional cropping.

The implementation should wrap widget loading behind an adapter so the admin can degrade gracefully if the widget cannot load or does not support the current device. Media Editor support should be validated in staging before it becomes the only image editing path.

Alternative considered: build crop/overlay tooling in the app. That would duplicate Cloudinary functionality and increase browser-side complexity.

## Risks / Trade-offs

- Cloudinary Media Editor does not support all devices or workflows → keep replacement and selection workflows available, and show a clear fallback when editing is unavailable.
- Identity-to-Author mapping may be incomplete for legacy content → preserve the existing owner fallback, document required Contentful metadata, and show safe "unknown author" states only when data is genuinely unresolved.
- Dedicated editor routes add navigation complexity → implement route guards, unsaved-change prompts, and return paths from the beginning.
- Public author pages expose profile content → only render fields intended for public display and avoid exposing Identity e-mail or role metadata.
- Widget scripts are external runtime dependencies → lazy-load them only when needed and keep secrets in server-side signing/config endpoints.

## Migration Plan

1. Add the author profile and byline requirements without changing existing content models destructively.
2. Add route-level editor pages while keeping dashboard list entry points.
3. Move the existing editor form into the new route surface and preserve current save/publish APIs.
4. Add author profile APIs and UI, then connect public byline rendering.
5. Add image interaction and Cloudinary widget adapter behind a feature-detecting workflow.
6. Smoke test in staging with Netlify Identity, Contentful author data, and Cloudinary assets before merging onward.

Rollback is straightforward while the change is route/UI focused: keep existing admin API contracts stable, and disable new route links or widget entry points if staging validation fails.

## Open Questions

- What exact Contentful field should map a Netlify Identity user to an Author entry: e-mail, Identity subject, slug, or dedicated external ID?
- Should author profile editing be available to writers immediately, or owner-only until the first writer profile workflow is validated?
- Should the first public author view be a dedicated `/blog/authors/:slug` page or an inline author card attached to article pages?
- Should Media Editor exports update the original Cloudinary asset, create a derived asset, or only store a transformed delivery URL on the article?
