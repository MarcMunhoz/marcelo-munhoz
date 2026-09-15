## 1. Baseline And Dependency Approval

- [x] 1.1 Add a sanitized regression fixture representing Markdown emphasis, links, a standalone YouTube embed URL, existing Unicode emoji, and hostile active content without copying unrelated production data.
- [x] 1.2 Review maintained browser sanitizer and comprehensive emoji-picker candidates for license, Vue compatibility, accessibility, runtime network behavior, bundle impact, transitive dependencies, and known advisories.
- [x] 1.3 Present the exact dependency and version choices to the user and obtain explicit installation approval before changing package metadata.
- [x] 1.4 Install only the approved pinned dependencies inside the project container and update the existing lockfile without installing packages on the host.

## 2. Shared Safe Article Rendering Boundary

- [x] 2.1 Add failing unit tests for supported Markdown semantics, raw HTML handling, unsafe URL schemes, hostile attributes, approved image URLs, and preservation of ordinary Unicode emoji.
- [x] 2.2 Add failing unit tests for ordered content blocks and standalone-versus-inline video classification, including malformed URLs, unsupported schemes, lookalike hosts, invalid identifiers, and arbitrary iframe input.
- [x] 2.3 Implement the shared article-content utility that parses supported Markdown, disables or escapes raw HTML, sanitizes generated output with a strict allowlist, and returns typed presentation blocks.
- [x] 2.4 Implement exact YouTube URL validation and canonicalization to the approved privacy-enhanced embed origin without accepting CMS-controlled iframe attributes.
- [x] 2.5 Verify the shared utility tests and add explicit regression assertions that only sanitized output can reach an executable HTML rendering boundary.

## 3. Public Article Presentation

- [x] 3.1 Add failing component tests proving semantic emphasis, headings, strong text, links, lists, blockquotes, code, tables, images, Unicode emoji, and safe hostile-input behavior in a public article.
- [x] 3.2 Add a Vue-owned trusted video block with an accessible title, lazy loading, fullscreen support, restrictive referrer policy, and an explicit playback feature allowlist.
- [x] 3.3 Migrate the public article body from inert interpolation to ordered safe Markdown and trusted video blocks without changing article loading, metadata, tags, byline, or navigation behavior.
- [x] 3.4 Add responsive styles that keep article content bounded and render the player on its own full-width 16:9 row at compact and wide viewports.

## 4. Administrative Preview Parity

- [x] 4.1 Add failing component tests proving that editor preview renders the same safe Markdown and trusted video blocks as the public article while source mode retains the original Markdown.
- [x] 4.2 Migrate the article editor preview to the shared typed rendering boundary without changing form validation, authorization, draft persistence, dirty state, or lifecycle actions.
- [x] 4.3 Verify transitions between source and preview modes preserve Markdown, Unicode emoji, textarea selection where applicable, and compact-viewport containment.

## 5. Integrated Emoji Picker

- [x] 5.1 Add failing utility and component tests for saving a collapsed cursor or ranged selection, inserting a multi-code-point emoji, replacing selected text, restoring focus, positioning the caret, and updating dirty state.
- [x] 5.2 Add the approved locally bundled emoji picker to the article-body toolbar with search, categories, skin-tone variants, accessible labels, keyboard operation, visible focus, and deterministic dismissal.
- [x] 5.3 Connect emoji selection to the existing textarea model-update path and preserve selection across picker focus changes without altering Contentful storage.
- [x] 5.4 Add responsive styling and tests that keep the picker and its controls reachable within compact and wide editor viewports.

## 6. Browser Policy And Security Contracts

- [ ] 6.1 Add failing declarative tests requiring only the approved privacy-enhanced YouTube frame origin and rejecting broad or arbitrary frame allowances.
- [ ] 6.2 Update the production Content Security Policy with the minimum frame permission required by the trusted player.
- [ ] 6.3 Extend security regressions for scripts, event handlers, unsafe links and images, raw iframes, lookalike video domains, and CMS-controlled player attributes.
- [ ] 6.4 Review the final CMS-to-browser source and sink paths and update sanitized security documentation to distinguish safe Markdown output from trusted Vue-owned media.

## 7. Browser Journeys And Release Verification

- [ ] 7.1 Add Cypress coverage for formatted public content and a standalone full-width player using deterministic fixtures at desktop and mobile viewports.
- [ ] 7.2 Add Cypress coverage for keyboard opening, searching, selecting, and inserting emoji in the administrative editor without mutating external provider data.
- [ ] 7.3 Run the focused and full containerized Vitest suites, coverage thresholds, lint, production build, built-asset credential scan, and Chrome and Firefox Cypress matrices.
- [ ] 7.4 Validate all OpenSpec specifications in strict mode and confirm the change artifacts contain no placeholders, contradictions, local paths, secrets, or private environment identifiers.
- [ ] 7.5 Validate the affected article in an exact-commit Netlify Deploy Preview, confirming semantic Markdown, safe external links, the responsive player, CSP compatibility, emoji preservation, and no document-level overflow.
- [ ] 7.6 Record sanitized completion evidence and prepare the change for review without merging a pull request or modifying production content automatically.
