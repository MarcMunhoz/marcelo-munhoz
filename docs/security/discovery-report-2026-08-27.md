# Security Discovery Report — 2026-08-27

## Status

This document records discovery candidates only. It does not classify any item as a confirmed vulnerability or assign final severity. Source-to-sink validation, counterevidence review, reproducibility, and prioritization belong to the next OpenSpec task group.

## Scope and safety

- Scope: the complete tracked application repository, including public UI, administrative UI, Netlify Functions, local middleware, Contentful and Cloudinary integration code, deployment configuration, dependency manifests, tests, and documentation.
- Review mode: offline, read-only, and non-destructive.
- Explicit exclusions: `.env`, `.env.*`, credentials, private keys, secret-bearing files, staging, production, remote mutations, and external publication.
- Evidence in this report uses repository-relative paths and omits environment-specific identifiers and secret values.
- The Codex Security Deep Scan coordinator could not start its bundled Python helper. The fallback review uses isolated Python static checks plus independent specialist reviews; it does not claim that the unavailable coordinator completed successfully.
- On 2026-08-27, the helper failure occurred in the WSL-hosted Codex runtime even though an isolated Python container worked. It is treated as an environment limitation, not repository evidence.
- On 2026-08-28, the retry in native openSUSE was blocked before scan execution because the `codex_security_access` connector was not available or connectable under the active plan. This is an external environment or service limitation and provides no evidence about the repository.
- Codex Security SHALL NOT be retried in the current session. The authorized fallback remains isolated secret-safe Python static checks, independent specialist reviews, and independent complete repository reviews; this report SHALL NOT claim that the Codex Security Deep Scan completed.
- At the 2026-08-27 safe-stop checkpoint, the focused authorization, Function, integration, browser-content, and supply-chain reviews and one independent full-repository review were complete; two additional independent full-repository passes had been stopped before completion.

## Fallback coverage completion — 2026-08-28

The authorized fallback completed the pending discovery coverage without using Codex Security:

- Two new independent, complete, read-only repository reviews covered all tracked application source, Functions, frontend rendering and navigation, deployment configuration, dependency metadata, tests, scripts, and security documentation. Together with the complete pass retained from 2026-08-27, the fallback now contains three complete independent repository reviews.
- A separate focused specialist review mapped tasks 2.2 through 2.6 to concrete repository evidence and checked the prior candidate register for coverage gaps.
- A dependency-free Python static check enumerated tracked files, rejected prohibited filenames before reading, reviewed 180 text files, skipped one prohibited path, and found no secret-signature indicators, dynamic-code sinks, missing lockfile integrity for resolved non-link packages, or unexpected package registry hosts.
- The static check confirmed the already catalogued DOM HTML sinks, Identity metadata trust points, route decoding points, outbound request surfaces, and Markdown rendering boundaries. Static surface matches are inventory evidence, not validated vulnerabilities.
- No dependency installation, external access, remote mutation, generated coordinator artifact, or destructive probe occurred.

| Focused task | Completed discovery coverage |
| --- | --- |
| 2.2 | Netlify Identity session derivation, role and ownership checks, frontend guards and lifecycle, preview isolation, and the shared fail-closed gate across every administrative route. |
| 2.3 | Public and administrative routing, parsing, methods, local CORS, production headers, stable errors and logging, upstream deadlines, pagination, and repository-visible abuse limits. |
| 2.4 | Contentful and Cloudinary hosts, identifiers, payload variants, uploads, media URLs, lifecycle authorization, versions, replay, duplicate workflow requests, and concurrent updates. |
| 2.5 | CMS and Markdown renderers, direct HTML sinks, image and navigation URL construction, redirects, Identity display data, third-party scripts, and browser policy. |
| 2.6 | Tracked source, deployment and container configuration, manifests and lockfile, build credential scanner, tests, documentation, diagnostic isolation, and the absence of tracked generated browser bundles. |

The Codex Security Deep Scan remains incomplete because of the recorded external limitations. The fallback establishes completed group 2 discovery coverage only; candidate validation, severity, prioritization, and remediation remain explicitly out of scope until group 3 is authorized.

## Candidate register

### SEC-AUTH-01 — Administrative roles may trust user-controlled metadata

- Instance: `authorization:app/netlify/functions/contentfulAdminCore.js:40`
- Evidence: `rolesFromUser()` accepts `user_metadata.roles` when trusted application metadata is absent (`app/netlify/functions/contentfulAdminCore.js:39-41`), and the resulting session drives writer/owner authorization (`app/netlify/functions/contentfulAdminCore.js:47-71`, `app/netlify/functions/contentfulAdminCore.js:1751-1765`).
- Plausible impact: privilege escalation into Contentful and Cloudinary administrative operations if the deployed identity provider permits self-service modification of that metadata.
- Existing controls: Netlify supplies the authenticated user context; absent sessions return 401 and insufficient roles return 403.
- Validation needed: establish the deployed Netlify Identity metadata mutability and token-claim contract.
- Taxonomy: CWE-269, CWE-863.

### SEC-AUTH-02 — Author ownership may trust user-controlled metadata

- Instance: `ownership:app/netlify/functions/contentfulAdminCore.js:45`
- Evidence: the session accepts `user_metadata.authorEntryId` (`app/netlify/functions/contentfulAdminCore.js:44-58`), and ownership accepts that identifier as an alternative to the writer subject (`app/netlify/functions/contentfulAdminCore.js:940-949`). Profile and article operations consume the derived author identity (`app/netlify/functions/contentfulAdminCore.js:1231-1249`, `app/netlify/functions/contentfulAdminCore.js:1502-1559`).
- Plausible impact: cross-author profile or article access by an authenticated writer if the claim can be changed by the user and another author identifier is known.
- Existing controls: exact identifiers are required; missing ownership data fails closed; version checks protect stale writes.
- Validation needed: establish metadata mutability, identifier exposure, and each reachable ownership path.
- Taxonomy: CWE-639, CWE-862, CWE-863.

### SEC-DATA-01 — Raw Contentful fields may bypass server-owned author fields

- Instance: `mass-assignment:app/netlify/functions/contentfulAdminCore.js:476`
- Evidence: `articlePayloadFromData()` returns supplied `data.fields` directly (`app/netlify/functions/contentfulAdminCore.js:476-479`), while the intended author and writer binding occurs outside that early-return shape (`app/netlify/functions/contentfulAdminCore.js:908-912`). Create and update operations forward the resulting fields (`app/netlify/functions/contentfulAdminCore.js:1432`, `app/netlify/functions/contentfulAdminCore.js:1559`).
- Plausible impact: forged attribution, ownership transfer, or bypass of field-level normalization by an authenticated writer.
- Existing controls: writer role checks, existing-article ownership checks, and upstream versioning.
- Validation needed: exercise both accepted payload shapes in deterministic unit tests and trace stored ownership fields.
- Taxonomy: CWE-639, CWE-915.

### SEC-WORKFLOW-01 — Editorial requests may be duplicated or replayed

- Instance: `workflow-race:app/netlify/functions/contentfulAdminCore.js:1661`
- Evidence: submit and unpublication-request flows create a new editorial request after checking article state and version, but do not reserve, deduplicate, or reuse an existing open request (`app/netlify/functions/contentfulAdminCore.js:1661-1728`).
- Plausible impact: duplicate queue entries, inconsistent review state, and ambiguous lifecycle actions under repeated or concurrent requests.
- Existing controls: writer ownership, article state checks, and Contentful version checks.
- Validation needed: deterministic concurrent/repeated-call tests and confirmation of expected workflow idempotency.
- Taxonomy: CWE-362, CWE-841.

### SEC-CLOUD-01 — Cloudinary listing fallback may widen account scope

- Instance: `resource-scope:app/netlify/functions/contentfulAdminCore.js:1118`
- Evidence: after scoped folder/prefix attempts, the fallback lists image resources without the configured folder or prefix (`app/netlify/functions/contentfulAdminCore.js:1118-1141`). The current test suite explicitly expects this fallback (`app/tests/cloudinaryMedia.test.js:124-176`).
- Plausible impact: authenticated writers may receive identifiers and metadata for unrelated assets in the same Cloudinary account.
- Existing controls: writer authorization and initial scoped queries.
- Validation needed: confirm whether the deployed account is shared across unrelated assets and define the required media boundary.
- Taxonomy: CWE-200, CWE-862.

### SEC-UPLOAD-01 — Media uploads lack application-level size and type bounds

- Instance: `upload-abuse:app/netlify/functions/contentfulAdminCore.js:1146`
- Evidence: the administrative endpoint accepts a writer-supplied Data URI and checks only its `data:` prefix before forwarding it to Cloudinary (`app/netlify/functions/contentfulAdminCore.js:1143-1173`, `app/netlify/functions/contentfulAdminCore.js:1877-1892`). The browser `accept` attribute and the local Express 1 MB limit are not production server controls.
- Plausible impact: unexpected file handling, memory/egress consumption, third-party cost, or invocation exhaustion.
- Existing controls: writer authorization and external Netlify/Cloudinary limits not defined by repository evidence.
- Validation needed: establish provider request limits and add boundary tests for bytes, MIME type, encoding, and accepted image formats.
- Taxonomy: CWE-400, CWE-434.

### SEC-URL-01 — Alternate author-photo payloads may bypass URL allowlisting

- Instance: `url-validation:app/netlify/functions/contentfulAdminCore.js:880`
- Evidence: the safe fallback-photo path applies an HTTPS host allowlist (`app/netlify/functions/contentfulAdminCore.js:774-795`), but alternate `photo` and `photoUrl` shapes are persisted without the same validation (`app/netlify/functions/contentfulAdminCore.js:880-888`, `app/netlify/functions/contentfulAdminCore.js:1511-1531`).
- Plausible impact: persistence of an unapproved remote URL into public or administrative image surfaces.
- Existing controls: the normal frontend payload uses the constrained path; browser CSP limits image origins.
- Validation needed: prove the alternate API shape is accepted and trace the persisted value into every browser sink.
- Taxonomy: CWE-20, CWE-939 (provisional).

### SEC-URL-02 — Article media payloads may bypass the configured media boundary

- Instance: `media-validation:app/netlify/functions/contentfulAdminCore.js:356`
- Evidence: writer-controlled article payloads may supply `thumbnail` or `cloudinary` metadata that is localized and persisted without an application-owned validation of URL host, account scope, public identifier, type, or length (`app/netlify/functions/contentfulAdminCore.js:356-365`, `app/netlify/functions/contentfulAdminCore.js:444-466`, `app/netlify/functions/contentfulAdminCore.js:1422-1433`, `app/netlify/functions/contentfulAdminCore.js:1535-1560`). Public image helpers later use the stored `public_id`, `secure_url`, or `url` (`app/src/utils/contentfulImages.js:4-17`, `app/src/components/BlogArticle.vue:11`).
- Plausible impact: persistence of media references outside the configured application library, unsafe or unexpected image navigation, or inconsistent asset ownership.
- Existing controls: writer authorization, normal UI selection and upload workflows, fixed Cloudinary URL construction for cards, and CSP image-origin restrictions.
- Validation needed: exercise direct API payload variants and trace each stored media shape through Contentful normalization and browser behavior. Keep this separate from `SEC-URL-01` unless validation proves a shared implementation root cause rather than only a shared invariant.
- Taxonomy: CWE-20, CWE-939 (provisional).

### SEC-AVAIL-01 — Outbound requests do not use uniform deadlines

- Instance: `availability:app/netlify/functions/contentfulProxyCore.js:298`
- Evidence: public Contentful and administrative Contentful/Cloudinary fetches lack an application-owned abort deadline (`app/netlify/functions/contentfulProxyCore.js:298`, `app/netlify/functions/contentfulAdminCore.js:1046`, `app/netlify/functions/contentfulAdminCore.js:1071`, `app/netlify/functions/contentfulAdminCore.js:1167`, `app/netlify/functions/contentfulAdminCore.js:1193`).
- Plausible impact: slow upstreams can occupy serverless invocations and increase latency or cost.
- Existing controls: Gravatar uses an abort timeout, Cloudinary pagination is capped, and Contentful rate-limit retry is bounded.
- Validation needed: compare provider and Netlify deadlines with the required application limit.
- Taxonomy: CWE-400.

### SEC-PARSE-01 — Malformed administrative paths may escape controlled error handling

- Instance: `request-parsing:app/netlify/functions/contentfulAdminCore.js:1734`
- Evidence: administrative route payload construction decodes path segments before the protected operation boundary, and multiple route branches use that helper (`app/netlify/functions/contentfulAdminCore.js:1734`, `app/netlify/functions/contentfulAdminCore.js:1846-1963`).
- Plausible impact: anonymous malformed paths may trigger uncontrolled exceptions and 5xx responses or operational noise.
- Existing controls: JSON parsing has explicit error handling, but path decoding does not share it.
- Validation needed: deterministic malformed-encoding tests at the exported handler boundary.
- Taxonomy: CWE-20, CWE-248.

### SEC-ABUSE-01 — Legacy public pagination accepts excessive page values

- Instance: `pagination:app/netlify/functions/contentfulProxyCore.js:27`
- Evidence: legacy `/entries` and `/tagged` routes use permissive integer parsing and unbounded skip calculation (`app/netlify/functions/contentfulProxyCore.js:27-32`, `app/netlify/functions/contentfulProxyCore.js:450-458`, `app/netlify/functions/contentfulProxyCore.js:574-584`). The newer blog-index route applies digit, safe-integer, and maximum-page controls (`app/netlify/functions/contentfulProxyCore.js:34-48`).
- Plausible impact: repeated invalid upstream work, avoidable errors, and invocation consumption.
- Existing controls: URL parameters are encoded and the newer route has deterministic limits.
- Validation needed: confirm whether legacy routes remain reachable and measure provider behavior for excessive skip values.
- Taxonomy: CWE-20, CWE-400.

### SEC-XSS-01 — CMS Markdown reaches multiple unsanitized HTML sinks

- Instance family: `stored-xss:app/src/components/BlogArticle.vue:304`
- Evidence:
  - The public Contentful proxy returns article fields without HTML sanitization (`app/netlify/functions/contentfulProxyCore.js:589-609`).
  - The public article renderer parses CMS Markdown, rewrites links with a regular expression, and assigns the result to `innerHTML` (`app/src/components/BlogArticle.vue:296-304`).
  - The article editor preview sends parsed Markdown to `v-html` (`app/src/pages/AdminArticleEditor.vue:112`, `app/src/pages/AdminArticleEditor.vue:380`).
  - The author biography preview sends parsed Markdown to `v-html` (`app/src/pages/AdminProfile.vue:56`, `app/src/pages/AdminProfile.vue:192`).
- Plausible impact: stored browser script or markup injection in public readers or authenticated administrative previews.
- Existing controls: publishing requires editorial roles; Vue escapes ordinary interpolation. No sanitizer dependency or sanitizer call is present at these HTML sinks.
- Validation needed: use safe unit-level payloads to establish exact Marked output, browser behavior, and which roles can persist content reaching each sink.
- Taxonomy: CWE-79.

### SEC-XSS-02 — CMS title reaches a direct `innerHTML` sink

- Instance: `stored-xss:app/src/components/BlogArticle.vue:311`
- Evidence: an article title from the public Contentful response is assigned to the shared header element with `innerHTML` (`app/src/components/BlogArticle.vue:284-311`).
- Plausible impact: stored browser injection independent of the Markdown body renderer.
- Existing controls: other title locations use Vue interpolation, but this direct DOM assignment bypasses it.
- Validation needed: confirm the target element lifecycle and browser handling with a non-destructive unit test.
- Taxonomy: CWE-79.

### SEC-PROJECTION-01 — Public Contentful responses are not field-projected

- Instance: `public-projection:app/netlify/functions/contentfulProxyCore.js:609`
- Evidence: public article, archive, and tagged routes forward Contentful entries instead of returning a purpose-built public projection (`app/netlify/functions/contentfulProxyCore.js:450-460`, `app/netlify/functions/contentfulProxyCore.js:464-512`, `app/netlify/functions/contentfulProxyCore.js:574-609`). The public author primary record has a narrower projection, demonstrating a contrasting control (`app/netlify/functions/contentfulProxyCore.js:332-363`).
- Plausible impact: a future internal field, identifier, or expanded Contentful include can become public by default as the content model evolves.
- Existing controls: published-content query constraints and the separate author projection.
- Validation needed: define the intended public article schema and compare it with every route response before deciding whether the current model exposes any protected field.
- Taxonomy: CWE-200.

## Hardening observations requiring classification

These items are not promoted to vulnerability candidates without additional deployment or impact evidence:

- The global CSP permits `default-src https:`, `'unsafe-inline'`, and `'unsafe-eval'` (`app/netlify.toml:4`). This materially weakens mitigation of the HTML sink candidates.
- The administrative media editor loads a mutable third-party `latest` script without a repository-pinned version or integrity control (`app/src/utils/cloudinaryMediaEditor.js:1`, `app/src/utils/cloudinaryMediaEditor.js:75-107`).
- Other third-party browser scripts are also loaded without repository-pinned integrity controls (`app/index.html:16-17`); the mutable media-editor endpoint is the highest-priority instance because it runs in the administrative surface.
- Administrative responses do not explicitly set `Cache-Control: no-store` (`app/netlify/functions/contentfulAdminCore.js:3-9`).
- The administrative dashboard requests only the first 100 Contentful entries (`app/netlify/functions/contentfulAdminCore.js:1435-1441`).
- Application-level rate limiting is not visible for public or administrative Functions; deployed Netlify controls remain an unverified assumption.
- `.env` is ignored, but `.env.*` variants are not covered by the same repository ignore rule (`.gitignore:42`). No prohibited file was opened and no environment file is tracked.
- The built-asset credential scanner omits the Contentful Delivery credential name, so a future browser-bundle leak of that server-side value may evade its current indicators (`app/scripts/scan-built-assets.js:5-24`, `app/netlify/functions/contentfulProxyCore.js:300`). No actual leak was identified.
- The container build installs unpinned global CLIs and uses `npm install` in the shared production base (`Dockerfile:13-15`); the base image is tag-pinned but not digest-pinned.
- The local development compose command runs dependency installation on each container start (`compose.yaml`).
- The frontend API base accepts an absolute build-time value, and administrative bearer requests use the resulting URL (`app/src/utils/apiBase.js:14-23`, `app/src/utils/adminApi.js:59-80`). The normal deployment documents a same-origin base, so this remains a build-integrity hardening observation unless a user-controlled or untrusted configuration path is established.

## Confirmed controls and negative results

- Administrative operations require a Netlify-provided user context and fail with 401/403 when session or role evidence is absent.
- Owner-only lifecycle and tag operations are enforced by the Function, independent of frontend visibility.
- Contentful writes use version headers, and editorial workflows check current article state and ownership.
- Outbound provider hosts are constants; no direct attacker-selected SSRF destination was identified.
- Production Functions do not emit permissive CORS headers; local middleware uses an allowlist and limits loopback origins to development.
- Public and administrative upstream errors use stable client messages, while detailed diagnostics are restricted to server logging or non-production output.
- No tracked `.env` file, private-key marker, known token pattern, or dependency resolved outside the expected package registries was identified by the secret-safe static checks.
- The current dependency audit baseline reports zero known vulnerabilities, and the existing build-credential test scans generated browser assets for configured credential names and secret-value indicators.

## Validation complete — 2026-08-28

The source-to-sink validation, counterevidence review, severity calibration, and sanitized prioritized register are recorded in `docs/security/validation-report-2026-08-28.md`. Four reportable low/medium-priority groups survived; deferred and suppressed rows retain explicit proof gaps or counterevidence. No candidate met the calibrated critical or high-severity threshold.

Focused delta requirements were added under `openspec/changes/audit-and-harden-application-security/specs/` for server-owned article fields, bounded media uploads, stable malformed-path errors, safe public CMS rendering, and bounded legacy public queries. Remediation may proceed against those contracts.
