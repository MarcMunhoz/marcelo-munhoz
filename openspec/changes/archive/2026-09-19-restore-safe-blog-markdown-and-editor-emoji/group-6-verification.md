## Group 6: Browser Policy And Security Contracts

The production frame policy now permits the privacy-enhanced YouTube origin required by the trusted player while retaining the existing application and Cloudinary media-editor sources. The declarative contract fixes the complete allowed source list and explicitly rejects wildcard, scheme-wide, and broader YouTube origins.

Security regressions now combine script markup, event handlers, unsafe links, unsafe image sources, raw iframes, a lookalike video host, and CMS-supplied player parameters. Raw iframe attributes never become structured media; an approved standalone URL is reduced to a canonical origin, path, and identifier before the Vue-owned player receives it.

The security documentation records the final source-to-sink split. Public and administrative article bodies share one sanitized Markdown boundary before `v-html`. Trusted media stays outside that HTML output and reaches a Vue-owned iframe whose title, loading, referrer, fullscreen, and playback permissions remain component-controlled.

### Verification

- The declarative policy tests failed before the CSP update because the exact privacy-enhanced frame origin was absent, then passed after the single-origin policy change: 20 tests passed.
- Focused article-content regressions passed in the container: 14 tests passed.
- The source-to-sink review covered the public Contentful path, authenticated administrative preview path, shared parser and sanitizer, HTML rendering directive, trusted-media canonicalizer, Vue-owned iframe, and production frame policy.
- No runtime dependency, CMS content, remote metadata, or deployment was changed in this group.

Full release matrices, browser journeys, strict OpenSpec validation, and Deploy Preview checks remain in group 7.
