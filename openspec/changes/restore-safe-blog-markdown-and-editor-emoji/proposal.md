## Why

Blog article bodies are currently rendered as inert text, so valid editorial Markdown and standalone video embeds are exposed literally instead of producing the intended reading experience. The safe text-only boundary fixed a stored-XSS risk, but the product now needs a sanitized rendering boundary and an integrated emoji workflow that restore authoring capability without restoring executable CMS content.

## What Changes

- Restore semantic rendering for supported Markdown in public articles while sanitizing CMS-controlled output and rejecting raw active content, arbitrary frames, unsafe URLs, and event handlers.
- Recognize a strictly allowlisted standalone YouTube URL as an accessible, full-width responsive player while leaving inline, malformed, lookalike, and unsupported URLs as safe links or text.
- Update the browser Content Security Policy only for the explicitly required privacy-enhanced YouTube player origin.
- Use the same safe Markdown presentation in the administrative article preview so authors review the format readers will receive.
- Add a searchable, categorized emoji picker with skin-tone variants and keyboard support that inserts Unicode emoji at the current article-body selection or cursor.
- Preserve existing article content, ordinary text editing, Markdown controls, workflow authorization, and compact-viewport behavior.
- Replace regressions that require inert Markdown with focused rendering, hostile-input, media, emoji, accessibility, and browser-policy coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `blog-public`: Public articles render supported Markdown and explicitly approved standalone video embeds through a safe, responsive browser boundary.
- `blog-admin`: The article editor provides a faithful safe preview and an accessible integrated emoji selection and insertion workflow.

## Impact

- Affects the public article component, administrative article editor, shared editorial utilities/components, responsive article styling, and Netlify browser security headers.
- Requires a reviewed, repository-pinned HTML sanitizer and emoji-picker dependency or equivalent maintained local implementation; dependency installation remains approval-gated.
- Updates component, utility, Cypress, security-policy, and declarative contract tests associated with article rendering and editing.
- Tracks GitHub issue #62 and preserves the existing Contentful article schema because emojis remain ordinary Unicode and Markdown remains stored as source text.
