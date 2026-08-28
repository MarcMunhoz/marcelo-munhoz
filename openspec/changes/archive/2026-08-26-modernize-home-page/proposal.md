## Why

A home page currently presents the author's identity through long paragraphs and a dense icon/chip layout that becomes difficult to scan, especially on mobile. This change will make the first impression clearer and more contemporary while preserving Marcelo's personal voice, technical focus, and cultural interests.

## What Changes

- Replace the current home hero image with the supplied Cloudinary image while preserving the existing cover-oriented composition as closely as possible.
- Rewrite the home introduction into a concise positioning statement and short supporting copy in Portuguese.
- Present key personal facts as compact, scannable information instead of embedding them in large paragraphs.
- Reorganize knowledge, tools, and projects into readable editorial groups and links/cards.
- Preserve the existing personality, including the “Projetos (in)úteis” tone, rather than adopting a generic portfolio style.
- Improve responsive behavior so the home remains readable without oversized text, overflow, or excessive vertical gaps on compact viewports.
- Keep the scope limited to the Home page; About, Blog, and administrative surfaces are not redesigned by this change.

## Capabilities

### New Capabilities

- `home-editorial-presentation`: Defines the modernized home-page hierarchy, concise copy, hero presentation, and scannable personal information.
- `home-responsive-layout`: Defines compact-viewport behavior for the home image, typography, knowledge groups, and project links.

### Modified Capabilities

None. The Home-specific contract is captured as new capabilities; existing Blog and About requirements remain unchanged.

## Impact

- Home page component and its local styles.
- Existing home data sources for knowledge items, project links, and dynamic experience facts.
- Public responsive-layout tests that assert the Home structure and compact breakpoint behavior.
- No API, authentication, Contentful, or external dependency changes are expected.
