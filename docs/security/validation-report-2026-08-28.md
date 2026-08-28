# Security Validation Report — 2026-08-28

## Scope and method

This report validates the 14 discovery candidates recorded in `docs/security/discovery-report-2026-08-27.md`. Validation used repository source/control/sink tracing, existing tests, a bounded Node harness in a network-isolated container, and the threat model in `docs/security/threat-model.md`.

No Codex Security tool or connector was used. No credential value, private-key content, production endpoint, authenticated session, or remote mutation was accessed. The authorized container dependency restore and read-only staging checks are documented below. The Deep Scan remains incomplete because of the external limitations recorded in the handoff and discovery report.

### Common validation rubric

- [ ] Attacker-controlled source and in-scope reachability are established without an unresolved deployment prerequisite.
- [ ] The closest security control is identified and shown complete or incomplete.
- [ ] The security-sensitive sink, protected state transition, or concrete impact is established.
- [ ] A meaningful trust-boundary effect is established for the stated attacker.
- [ ] Strongest counterevidence and remaining proof gaps are explicitly resolved.

An unchecked rubric item means the candidate is deferred or suppressed rather than silently promoted.

## Validation closure

| Candidate | Method and result | Confidence | Disposition | Survives | Impact / likelihood | Severity / priority | Final policy |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEC-AUTH-01 | Static trace from Netlify user context through `rolesFromUser()` to every admin role gate; harness confirms `user_metadata.roles` is accepted. Provider-side mutability is unproven. | medium | deferred | uncertain | high / unknown | medium / unassigned | deferred pending Identity configuration evidence |
| SEC-AUTH-02 | Static trace from `user_metadata.authorEntryId` through session ownership checks; harness confirms the mapping is accepted. Provider-side mutability and identifier exposure remain unproven. | medium | deferred | uncertain | medium / unknown | low / unassigned | deferred pending Identity configuration evidence |
| SEC-DATA-01 | Static trace plus existing management-facade test showing a supplied `data.fields` object is forwarded; server-owned author binding is bypassed by that branch. | high | reportable | yes | medium / high | medium / P2 | reportable |
| SEC-WORKFLOW-01 | Static trace of repeated request creation and existing version/state checks. No idempotency or reservation is present, but security impact beyond workflow duplication is not proven. | medium | deferred | uncertain | low / medium | low / unassigned | deferred pending workflow idempotency decision |
| SEC-CLOUD-01 | Static trace plus existing test of unscoped fallback. Account sharing and unrelated asset impact are deployment facts not present in the repository. | medium | deferred | uncertain | medium / unknown | low / unassigned | deferred pending Cloudinary scope evidence |
| SEC-UPLOAD-01 | Static trace plus existing upload tests and harness showing a non-image Data URI reaches the signed upload call. Provider rejection and platform body limits are not repository-owned controls. | high | reportable | yes | medium / medium | low / P3 | reportable |
| SEC-URL-01 | Static trace of alternate author-photo aliases into persisted profile fields; normal fallback path is allowlisted and browser CSP constrains image origins. | medium | suppressed | no | low / high | — | ignore: existing CSP and image-only sink limit attacker capability |
| SEC-URL-02 | Static trace of writer-supplied thumbnail/cloudinary metadata into Contentful and public image helpers. Provider/account scope and exact media behavior remain unknown. | medium | deferred | uncertain | low / unknown | low / unassigned | deferred pending media contract |
| SEC-AVAIL-01 | Static comparison of provider calls; Gravatar has an abort deadline while Contentful/Cloudinary calls rely on provider/platform behavior. No application-owned deadline is present. | medium | suppressed | no | low / medium | — | ignore: hardening gap without repository evidence of meaningful attacker impact |
| SEC-PARSE-01 | Bounded harness invokes malformed administrative article path and observes an uncaught `URIError` before the operation runs. | high | reportable | yes | low / high | low / P3 | reportable |
| SEC-ABUSE-01 | Bounded harness invokes legacy `/entries` with a very large page and observes an unsafe integer `skip`; route is public and still documented. | high | reportable | yes | low / high | low / P3 | reportable |
| SEC-XSS-01 | Static trace from CMS/admin Markdown through `marked.parse()` or equivalent to `innerHTML`/`v-html`; no sanitizer is present. Dynamic browser execution was unavailable because frontend dependencies are absent in the current container. | high | reportable | yes | high / medium | medium / P2 | reportable |
| SEC-XSS-02 | Static trace from public Contentful title to direct header `innerHTML`, independent of Markdown body parsing. | high | reportable | yes | high / medium | medium / P2 | reportable |
| SEC-PROJECTION-01 | Static trace shows raw article entries returned by public article/list routes; current model does not prove a protected field is exposed and future schema drift is the stated risk. | medium | deferred | uncertain | unknown / unknown | low / unassigned | deferred pending public schema contract |

## Per-finding attack-path facts

### SEC-DATA-01 — reportable, medium (P2)

- **Assumptions:** an authenticated writer can call the admin Function directly with a JSON object containing `fields`.
- **Context and scope:** in-scope administrative Contentful mutation; the path crosses the browser-to-admin-Function and admin-Function-to-Contentful boundaries.
- **Exposure and identity:** admin routes are exposed through the Netlify Function; writer role is required, but the writer is an in-scope lower-privileged actor relative to owner-controlled publication.
- **Attacker input:** `data.fields` is accepted as an object.
- **Control:** `articleDataForSession()` adds server-owned author and writer values, but `articlePayloadFromData()` returns the supplied `fields` branch before those values are translated into Contentful fields.
- **Sink:** create and update requests forward the returned fields to Contentful Management.
- **Impact:** forged attribution and bypass of normalized field handling; owner publication can make the forged data public.
- **Counterevidence:** updates still require existing-article ownership and a matching version; Contentful schema validation remains active. These controls do not restore server-owned field binding for the raw branch.
- **Proof gap:** exact Contentful field model behavior for arbitrary extra fields should be confirmed during remediation tests.
- **Confidence:** high.

### SEC-UPLOAD-01 — reportable, low (P3)

- **Assumptions:** an authenticated writer can call `/media/upload` directly.
- **Context and scope:** in-scope admin media workflow crossing the Function-to-Cloudinary boundary.
- **Attacker input:** writer-supplied `data.file` Data URI.
- **Control:** the application checks only the `data:` prefix; local middleware has a 1 MB JSON limit, but the production Function limit is not established here.
- **Sink:** a server-signed Cloudinary image upload request.
- **Impact:** avoidable resource, provider-cost, or invocation pressure and type confusion risk; provider rejection may limit practical impact.
- **Counterevidence:** writer authentication, Cloudinary `image/upload`, and platform/provider limits reduce impact; no application-owned MIME, byte, dimension, or replay bound exists.
- **Proof gap:** deployed Netlify and Cloudinary limits are unknown.
- **Confidence:** high for the missing application control, medium for impact.

### SEC-PARSE-01 — reportable, low (P3)

- **Assumptions:** malformed encoded article paths reach the administrative Function.
- **Attacker input:** malformed percent-encoding in an article route.
- **Control:** `articleIdFromPath()` calls `decodeURIComponent()` outside the handler's normalized error boundary.
- **Sink:** an uncaught `URIError` before authentication/operation response handling; the bounded harness reproduced this and confirmed no operation ran.
- **Impact:** stable JSON error handling is bypassed and malformed requests can generate Function 5xx noise.
- **Counterevidence:** the platform may convert the rejected Promise to a generic 5xx; this limits impact but does not provide the required user-safe response.
- **Confidence:** high.

### SEC-ABUSE-01 — reportable, low (P3)

- **Assumptions:** legacy public `/entries` remains reachable as documented.
- **Attacker input:** arbitrary public `page` query value.
- **Control:** `pageFromQuery()` uses permissive `parseInt` and positivity checks without a safe-integer or maximum-page bound.
- **Sink:** Contentful Delivery query `skip` calculation; the bounded harness reproduced an unsafe integer skip.
- **Impact:** avoidable upstream work or errors and invocation/provider consumption.
- **Counterevidence:** result limits are small and the newer `/blog-index` route is bounded; those controls do not apply to the legacy routes.
- **Confidence:** high for the query-bound gap, medium for provider impact.

### SEC-XSS-01 — reportable, medium (P2)

- **Assumptions:** a writer can persist Markdown or an owner can publish or preview content containing active HTML.
- **Attacker input:** CMS article body or author biography content.
- **Control:** Markdown is parsed but no sanitizer or executable-markup allowlist is present.
- **Sink:** public article `innerHTML` and administrative `v-html` previews.
- **Impact:** stored browser markup/script execution across the content-to-browser trust boundary, potentially affecting public readers or privileged reviewers.
- **Counterevidence:** publication requires editorial roles and ordinary Vue interpolation escapes many other fields; those controls do not sanitize these HTML sinks.
- **Proof gap:** browser runtime execution and exact provider content workflow were not dynamically exercised because frontend dependencies are absent; static sink and missing-control evidence is complete.
- **Confidence:** high for the unsanitized sink, medium for victim interaction and final impact.

### SEC-XSS-02 — reportable, medium (P2)

- **Assumptions:** a published article title reaches the public article component.
- **Attacker input:** CMS article title.
- **Control:** no escaping or text assignment is applied at the header update.
- **Sink:** direct `headerArticleName.innerHTML` assignment.
- **Impact:** title content can cross into executable browser markup independently of Markdown parsing.
- **Counterevidence:** other title renderings use Vue interpolation; this exact public header assignment bypasses that control.
- **Proof gap:** no browser DOM runtime was available; the static direct assignment is exact.
- **Confidence:** high.

## Deferred and suppressed findings

- `SEC-AUTH-01` and `SEC-AUTH-02` require provider-side Identity metadata mutability or claim-mapping evidence. They remain deferred, not disproven.
- `SEC-WORKFLOW-01` requires a product decision and deterministic concurrency test to show whether duplicate requests create security-relevant integrity impact.
- `SEC-CLOUD-01` and `SEC-URL-02` require the deployed Cloudinary account/media contract to establish cross-scope impact.
- `SEC-PROJECTION-01` is a schema-drift risk without proof of a currently protected field in the public response; it remains deferred.
- `SEC-URL-01` is suppressed because the observed sink is image-only and the deployed CSP allowlist is repository-visible; reassess if another active-content sink is found.
- `SEC-AVAIL-01` is suppressed as a provider/platform hardening gap without demonstrated attacker impact; provider deadlines remain an operational assumption.

## Prioritization and root-cause groups

No candidate meets the calibrated critical or high-severity threshold after applying the threat model and the policy matrix. The remediation order is:

1. **P2 — Browser content execution:** `SEC-XSS-01` and `SEC-XSS-02` share a sanitization/text-boundary root cause but preserve separate sinks.
2. **P2 — Server-owned article fields:** `SEC-DATA-01` is a distinct mass-assignment root cause.
3. **P3 — Bounded request handling:** `SEC-PARSE-01` and `SEC-ABUSE-01` are separate parser and pagination controls.
4. **P3 — Upload bounds:** `SEC-UPLOAD-01` is a separate media-input control.
5. Deferred rows remain pending deployment or product-contract evidence and must not be silently fixed or discarded.

Only the first four groups have reportable outcomes. No finding was grouped solely because it shared a broad CWE or security invariant.

## Validation limitations

- The Codex Security Deep Scan did not complete and is not represented as completed evidence.
- No live Identity configuration, Netlify ingress, Contentful schema, Cloudinary account scope, provider limits, rate-limiting facility, staging, or production endpoint was inspected.
- These limitations lower confidence for deferred rows but do not suppress source/control/sink tuples established from repository evidence.

## Remediation handoff

The following reportable findings are implemented by this change with focused regressions:

- `SEC-DATA-01`: alternate article field payloads are reduced to the allowlisted editorial shape and server-owned author binding before Contentful writes.
- `SEC-UPLOAD-01`: uploads require an allowlisted base64 image media type and a deterministic decoded byte bound before Cloudinary is called.
- `SEC-PARSE-01`: malformed administrative route encoding returns a stable 400 response without invoking an operation.
- `SEC-ABUSE-01`: legacy public pagination uses safe-integer and maximum-page bounds; malformed legacy tags are rejected before the provider call.
- `SEC-XSS-01` and `SEC-XSS-02`: public and administrative previews use text-only boundaries (`textContent`/Vue interpolation) instead of executable HTML sinks.

Deferred and suppressed rows have explicit ownership and follow-up:

| Rows | Status | Owner | Follow-up |
| --- | --- | --- | --- |
| SEC-AUTH-01, SEC-AUTH-02 | Deferred | Identity/platform maintainer | Confirm production claim provenance and metadata mutability in an authorized read-only deployment review. |
| SEC-WORKFLOW-01 | Deferred | Editorial workflow maintainer | Define idempotency semantics and add a concurrency test before changing request persistence. |
| SEC-CLOUD-01, SEC-URL-02 | Deferred | Media integration maintainer | Confirm Cloudinary account scope and media contract, then decide whether a single allowlist can cover each sink. |
| SEC-PROJECTION-01 | Deferred | Contentful schema maintainer | Define the public article projection and compare it against every public route after schema review. |
| SEC-URL-01, SEC-AVAIL-01 | Suppressed | Application maintainers | Reopen only if a new active-content sink or concrete attacker impact is established. |

No deferred item was silently treated as fixed, and no external ticket or deployment change was created.

## Independent fix verification — 2026-08-28

Each remediated path was re-evaluated against its original source-to-sink chain:

| Finding group | Verification evidence | Result |
| --- | --- | --- |
| SEC-DATA-01 | Alternate `fields` regression passes; static review shows raw `fields` and `metadata` are removed before normalized field construction, while session-owned author/writer values are rebuilt. | Original ownership-field bypass is no longer reachable through that payload shape. |
| SEC-UPLOAD-01 | Non-image Data URI regression passes with zero upstream calls; upload accepts only the allowlisted image media types and bounded decoded bytes. | Unsupported type and oversized-input paths stop before Cloudinary. |
| SEC-PARSE-01 | Malformed article route regression returns 400; `node --check` passes for the admin Function. | Malformed path no longer escapes as an uncaught URI error. |
| SEC-ABUSE-01 | Isolated public-handler harness confirms excessive legacy page values produce safe `skip: 0`; invalid legacy tags return 400 before the provider call. | Legacy query amplification path is bounded. |
| SEC-XSS-01 / SEC-XSS-02 | Repository-wide sink search returns no `innerHTML`, `outerHTML`, `v-html`, or `marked.parse` in the affected frontend code; admin frontend contract tests pass. | The reviewed CMS Markdown/title paths use text-only boundaries. |

Adjacent-boundary probe results:

- No remaining executable HTML sink was found under `app/src`.
- No remaining raw article `fields`/`metadata` forwarding branch was found after the sanitizer branch.
- The only remaining `FormData` media upload call is preceded by `isBoundedImageDataUri()`.
- All administrative article and tag path decoding uses the normalized error boundary.
- Legacy public list/tag routes share the safe-integer page calculation and reject malformed tags.

The complete security diff review found no supported regression beyond the intentional loss of rendered HTML/Markdown preview in favor of safe text-only display. Focused regression evidence is 166/166 tests passed across the admin frontend, admin Function, management facade, and Cloudinary media suites.

## Final container validation — 2026-08-28

The authorized final workflow restored the exact lockfile dependencies inside a temporary Node container. An initial build invocation automatically detected a local dotenv file in its mount. No dotenv value was printed or retained as evidence; that build was discarded, its generated output was replaced, and the authoritative workflow was rerun from an isolated copy that excluded `.env` and `.env.*` before any file content was copied.

Authoritative results from the isolated copy:

| Check | Result | Evidence |
| --- | --- | --- |
| Clean dependency restore | Passed | 404 packages restored from the lockfile; install audit reported 0 vulnerabilities. |
| Dependency audit | Passed | `npm audit --audit-level=high`: 0 known vulnerabilities. |
| Lint | Passed | `npm run lint`: exit 0. |
| Automated tests | Passed | `npm test`: 316 tests passed, 0 failed, 20 suites. |
| Production build | Passed | `npm run build`: Quasar SPA build succeeded with no dotenv files and zero injected dotenv values. |
| Built-asset credential scan | Passed | `npm run scan:build-credentials`: no credential-name indicators were found. |
| Backend smoke | Passed | Local isolated `GET /healthz`: HTTP 200 with body `OK`. |
| Frontend smoke | Passed | Local isolated static request: HTTP 200 with the application shell and module entry present. |

The repository-local ignored `dist` output was replaced with the isolated build and rescanned successfully.

## Authorized read-only staging verification — 2026-08-28

The separately authorized check used the public staging origin referenced by tracked repository documentation. The hostname is intentionally omitted. Requests were limited to low-volume unauthenticated `GET` and `OPTIONS` checks plus one manual HTTP redirect check. No credential, browser session, mutation method, destructive payload, rate test, production endpoint, or provider administration surface was used.

| Boundary | Result | Classification |
| --- | --- | --- |
| Transport | HTTP redirected permanently to HTTPS; HSTS was present on the HTTPS response. | Deployment control verified. |
| Global browser headers | CSP, framing protection, content-type protection, and referrer policy were present. `Permissions-Policy` was absent. | Partial control; missing policy is a hardening observation without a demonstrated attack path. |
| CSP posture | The deployed CSP retained broad HTTPS defaults and executable inline/eval allowances and did not explicitly restrict object or base URI sources. | Existing least-privilege hardening opportunity; no new reachable exploit was established by this check. |
| Referrer posture | A referrer policy was present but was not one of the stricter repository-review profiles. | Privacy hardening observation, not a validated vulnerability. |
| Public Function | A read-only public route returned JSON successfully; an unknown public route returned a stable JSON 404 without diagnostic indicators. | Public routing and safe error boundary verified for the checked paths. |
| Cross-origin behavior | The tested untrusted origin received no `Access-Control-Allow-Origin` header. The public preflight returned a normal success response rather than a dedicated preflight response. | Cross-origin read access was not granted; explicit `OPTIONS` handling remains defense in depth. |
| Administrative Function | Both the configured administrative rewrite path and direct Function-shaped path returned the same SPA document as the root page. No administrative operation or Identity challenge was reached. | The administrative artifact/redirect is absent or stale in this deploy. It fails closed by unavailability, but deployed authentication, role, and CORS controls remain unverified. |
| Crawl controls | The administrative SPA path and `robots.txt` request both resolved to the SPA shell; no static crawl exclusion was observed by the non-browser check. | Discoverability hardening only; crawler controls are not an authorization boundary, and dynamic browser metadata was not executed. |

No staging result changes the validated finding register. In particular, `SEC-AUTH-01` and `SEC-AUTH-02` remain deferred because the checked deploy did not expose the administrative Function or Identity claim contract. Deployment owners should verify artifact parity before relying on this origin for administrative acceptance tests, then repeat the same unauthenticated checks against the deployed administrative Function. No staging configuration was changed.
