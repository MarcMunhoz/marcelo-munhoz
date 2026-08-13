# Staging Handoff

This handoff records the production-like smoke status for the refined blog admin experience. Keep provider values, deploy URLs, local paths, user IDs, tokens, and asset IDs out of this file.

## Current Branch State

- Feature branch: `issue_49`.
- Staging branch: `staging`.
- Staging has received the admin workflow commits required for preview validation.
- The local checkout should remain on `issue_49` unless intentionally validating another branch.

## Confirmed In Staging

- Netlify Identity widget loads in the staging branch deploy.
- Invite and recovery hashes can be tested on the staging branch deploy by preserving the hash fragment and changing only the deploy host.
- Signed-out `/admin` opens the Identity login flow.
- After sign-in, the authenticated user can reach the admin dashboard.
- Article listing returns `200`.
- Article author names render as readable names instead of raw Contentful entry IDs.
- Owner edit actions appear for the owner-authored articles currently visible in staging.
- The media library route returns `200` and a safe JSON payload.
- Cloudinary media library listing works after changing the Cloudinary API user role from `Media Library User` to `Master Admin`.

## Implemented Fixes During Staging Smoke

- Loaded the Netlify Identity widget in the HTML shell and allowed it through CSP.
- Added a login fallback for environments where the widget is unavailable.
- Hid the admin surface while a signed-out production user is being sent to login.
- Closed the Identity modal and reloaded session/dashboard state on the Identity `login` callback.
- Added owner edit fallback for legacy articles when the resolved Contentful author name matches the Netlify Identity user name.
- Added automatic slug generation for new articles until the slug field is edited manually.
- Added Cloudinary media fallback across configured folder, default folder, unscoped listing, and empty pages that return `next_cursor`.

## Cloudinary Media Library Finding

The media library initially returned an empty asset list in staging even though the route returned `200`.

Current evidence:

- The browser request is made to the admin media route with `max_results`.
- The Function response is successful and sanitized.
- With the Cloudinary API user set to `Media Library User`, the response contained an empty `assets` array.
- Earlier smoke evidence showed an empty page with a cursor; the backend now follows empty cursor pages before returning.
- Marking the Cloudinary folder variable as secret in Netlify should not affect runtime listing. It only affects Netlify build secret scanning, and the build config already omits public folder keys from secret scanning.
- Changing the same Cloudinary API user to `Master Admin` made existing assets appear without rebuilding or redeploying staging.

Conclusion:

- The staging environment variables were pointing at the expected Cloudinary cloud and folder.
- `Media Library User` can authenticate but does not provide enough access for the Admin API resource listing used by the admin backend.
- The server-side Cloudinary API user must use `Master Admin` for this workflow unless Cloudinary exposes a narrower role that still supports resource listing and upload.

Operational rule:

- Keep Cloudinary API credentials server-side in Netlify Functions/runtime only.
- Keep `CLOUDINARY_UPLOAD_FOLDER` or `CLOUDINARY_FOLDER` unmarked as secret because the folder is a public URL path prefix.
- Do not add frontend `VITE_` variants for Cloudinary API credentials.

## Identity Metadata Notes

Preferred edit authorization is still `authorEntryId` metadata on the Netlify Identity user matching the Contentful Author entry.

The owner-name fallback exists only to support legacy owner-authored content already in Contentful. Guest writers should still be configured with trusted author metadata rather than relying on display-name matching.

## Resume Checklist

- Staging deploy completed.
- `/admin` was hard refreshed in the staging branch deploy.
- Login closes automatically after successful sign-in.
- A new article title fills the slug until the slug is manually edited.
- Owner edit buttons remain visible for owner-authored rows.
- Existing Cloudinary assets appear in the media library.
- Keep the Cloudinary API user on `Master Admin` while this admin workflow uses the Admin API resource list.
- If Cloudinary exposes narrower account roles later, retest resource listing and upload before reducing permissions.
