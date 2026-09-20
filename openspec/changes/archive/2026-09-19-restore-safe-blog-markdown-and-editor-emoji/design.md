## Context

See `proposal.md` for motivation. The public article component currently interpolates `article.body` as text. Before the security hardening change, it parsed the body with Marked, rewrote video links through a regular expression, and assigned the resulting unsanitized string to `innerHTML`; the administrative previews had equivalent executable sinks. Existing security specifications permit rendered Markdown only when executable markup, unsafe URLs, and script-capable elements are sanitized or otherwise constrained.

Marked and its heading plugins remain repository dependencies, but no HTML sanitizer or integrated emoji dataset is installed. The production Content Security Policy currently permits frames only from the application and the Cloudinary media editor, so an approved player also requires a narrow policy adjustment. Contentful already stores article bodies as Unicode strings, requiring no content migration or schema change.

## Goals / Non-Goals

**Goals:**

- Establish one testable article-body interpretation boundary shared by public rendering and administrative preview.
- Keep Markdown parsing, output sanitization, trusted media recognition, and Vue presentation as separately testable responsibilities.
- Make video trust decisions from parsed URLs and exact allowlists rather than regular-expression replacement of generated HTML.
- Add a locally bundled, maintained emoji picker that integrates with the existing textarea selection and form state.
- Preserve the current security requirements and least-privilege browser policy.

**Non-Goals:**

- Allow raw HTML, author-supplied iframes, scripts, styles, or arbitrary embedded providers.
- Add a general-purpose rich-text/WYSIWYG editor or migrate stored Markdown to Contentful Rich Text.
- Rewrite existing article bodies or replace existing Unicode emoji.
- Expand video support beyond YouTube in this change.
- Change article lifecycle, authorization, Contentful persistence, or public API payloads.

## Decisions

### 1. Produce typed presentation blocks through a shared article-content utility

A shared utility will accept the Markdown source and return an ordered list of typed blocks. Ordinary source regions become sanitized Markdown HTML blocks; an exact standalone approved video paragraph becomes a structured video block. The public component and editor preview will render this same output, eliminating the current preview/public mismatch.

The utility will recognize a video only after parsing with the platform URL parser, checking HTTPS, an exact YouTube host and supported path shape, and a bounded video identifier. It will canonicalize approved embeds to the privacy-enhanced YouTube origin. Detection happens at the Markdown paragraph boundary, so a URL inside prose remains ordinary content.

Alternatives considered:

- Rewriting generated anchor HTML with a regular expression repeats the vulnerable legacy design and cannot reliably establish URL or paragraph boundaries.
- Performing the conversion only in the public component leaves the administrative preview misleading and duplicates trust logic.

### 2. Parse Markdown with Marked and sanitize every generated HTML block with a strict allowlist

Marked will retain standards-compatible Markdown parsing. A repository-pinned, browser-compatible sanitizer will constrain the generated result to semantic text-formatting elements and explicitly approved attributes and URL schemes. Raw Markdown HTML will be disabled or escaped before sanitization, and sanitization remains a defense-in-depth boundary before any `v-html` use. Article-provided iframe elements will never enter the allowlist.

Links opened outside the site will receive safe relationship attributes. Image sources will use approved HTTPS origins already supported by the product policy. Sanitized output, rather than raw CMS or parser output, is the only value allowed to reach the HTML rendering directive.

Alternatives considered:

- A bespoke Vue renderer for the complete Marked token tree avoids an HTML directive but would recreate extensive Markdown semantics and sanitizer behavior with a larger long-term security surface.
- Server-only sanitization would couple stored content to current presentation, duplicate browser preview behavior, and make rollback or policy evolution harder.

### 3. Render trusted video blocks as Vue-owned responsive elements

The article and preview components will render a Vue-created iframe only for a structured trusted video block. The wrapper will use full available width and a 16:9 aspect ratio; the iframe will have an accessible title, lazy loading, fullscreen support, a restrictive referrer policy, and an explicit feature allowlist. The Content Security Policy will add only the privacy-enhanced YouTube frame origin.

Keeping the iframe outside sanitized Markdown means the sanitizer does not need to allow any frame element and prevents CMS content from choosing iframe attributes or origins.

### 4. Integrate a locally bundled comprehensive emoji picker at the body-editor boundary

The implementation will use a reviewed, repository-pinned picker that provides Unicode data, search, categories, skin-tone variants, keyboard navigation, and accessible labelling without loading executable code or datasets from a runtime CDN. A framework-neutral web component such as `emoji-picker-element` is preferred over maintaining a Unicode catalog in application code, subject to dependency compatibility and security review before installation.

The editor will preserve its textarea selection before focus enters the picker. Selecting an emoji will replace the saved selection through the same model update path used by typing, restore focus, position the caret after the inserted Unicode sequence, and participate in existing dirty-state and navigation guards. The picker will be lazy-mounted or opened on demand to limit initial editor cost.

The picker will use a non-modal floating panel owned by the body editor instead of participating in its document flow. On wide viewports, authors can drag the panel by an explicit handle, with pointer coordinates clamped to the body-editor boundary. While the panel remains open, deliberate selection changes in the focused textarea refresh the insertion target. Compact viewports use a contained full-width placement without requiring drag interaction.

Alternatives considered:

- A curated static list is smaller but does not satisfy comprehensive search, categories, variants, or evolving Unicode coverage.
- Operating-system picker invocation has no consistent cross-browser web API and cannot provide the requested in-editor experience.

### 5. Treat dependency and security-policy changes as explicit review gates

No package will be installed until the user approves the exact sanitizer and emoji-picker dependencies. The implementation will review package maintenance, browser compatibility, transitive dependencies, bundle impact, and known advisories, then pin accepted versions in the existing lockfile. Declarative policy tests will require the exact YouTube frame origin and continue rejecting broad frame directives.

### 6. Verify behavior at utility, component, and browser boundaries

Utility tests will cover Markdown semantics, sanitization, URL canonicalization, block ordering, hostile schemes, lookalike hosts, invalid identifiers, raw HTML, and inline-versus-standalone video behavior. Component tests will verify semantic nodes, shared preview parity, textarea selection replacement, focus restoration, and existing-content preservation. Cypress will exercise reader formatting/player presentation and the keyboard-accessible emoji workflow at desktop and compact viewports. Existing source-policy and credential-scan controls remain unchanged.

## Risks / Trade-offs

- [Sanitizer configuration accidentally admits active content] → Use a narrow element/attribute/scheme allowlist, exclude all iframe input, add hostile regression fixtures, and retain CSP as defense in depth.
- [Sanitization removes legitimate legacy formatting] → Cover the formatting already offered by the editor toolbar and the article styles, then validate representative published Markdown before release.
- [YouTube changes embed requirements] → Isolate canonicalization and player policy behind one utility/component and fail closed to an ordinary link when input is not recognized.
- [Emoji dependency increases bundle size] → Prefer on-demand loading, measure the production build, and reject runtime CDN loading.
- [Textarea selection is lost when the picker receives focus] → Capture the selection before opening the picker and test collapsed, ranged, keyboard, and compact-viewport flows.
- [Public and preview presentation drift later] → Make both consumers depend on the same typed-block utility and enforce parity with shared fixtures.

## Migration Plan

1. Add approved pinned dependencies and focused failing tests without changing persisted content.
2. Introduce the shared safe rendering boundary and migrate administrative preview first, then public rendering.
3. Add the trusted player component and narrow CSP origin, validating rejection paths before remote smoke.
4. Add the emoji picker integration and accessibility/responsive coverage.
5. Run the full containerized quality suite and validate the affected published article in a Deploy Preview.
6. Roll back by reverting the rendering and CSP changes; stored Markdown and Unicode emoji remain intact, so rollback requires no data migration.
