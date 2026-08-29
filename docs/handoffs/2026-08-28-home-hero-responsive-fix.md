# Handoff: responsive home hero correction

Date: 2026-08-28 to 2026-08-29
Status: correction implemented and validated
Working branch: `develop`

## User request

Apply a quick responsive correction to the home hero directly on `develop`, then merge it into `main` without a pull request. Do not create an OpenSpec change or a separate issue.

The user paused the task because the session limit was nearly exhausted and explicitly resumed it on 2026-08-29.

## Reported symptom

On a 1920x1080 display, the home hero is vertically cropped. The top and bottom of the composition are not fully represented, so the current result does not behave responsively across viewport proportions.

## Evidence gathered

- The relevant component is `app/src/pages/IndexPage.vue`.
- The desktop hero currently uses:
  - `.home-hero { height: min(500px, 52vw); overflow: hidden; width: 100%; }`
  - `.home-hero-image { height: 100%; object-fit: cover; object-position: center; width: 100%; }`
- The compact breakpoint at 700px currently uses `height: clamp(160px, 43.75vw, 240px)`.
- The source asset `marcelomunhoz_hero.png` reports intrinsic dimensions of 1731x909, approximately a 1.90:1 aspect ratio.
- At a desktop width near 1920px, the fixed 500px hero produces a container aspect ratio near 3.84:1. Combined with `object-fit: cover`, this necessarily removes a substantial vertical portion of the source composition.
- The desktop height and cover behavior were introduced during the home-page modernization. A later change adjusted only the compact breakpoint.
- Existing responsive assertions are in `app/tests/publicResponsiveLayout.test.js` and currently encode the compact hero height, but do not prevent destructive desktop cropping.

## User direction about Cloudinary

Do not physically modify the source image. Use Cloudinary delivery transformations as appropriate:

- `w_<pixels>` and `h_<pixels>` for requested dimensions;
- `c_scale,w_<pixels>` to scale while preserving proportions;
- `f_auto` for automatic output format;
- `q_auto` for automatic quality.

The final implementation should use Cloudinary delivery capabilities together with responsive HTML/CSS. Do not assume that a local image rewrite is necessary.

## Confirmed diagnosis

The root cause was the mismatch between the desktop container ratio and the source image ratio, made destructive by `object-fit: cover`. The final correction preserves the source composition while retaining the existing visual language.

## Continuation sequence

1. Reconfirm that `develop` is clean and aligned with `origin/develop` without reading any `.env` file.
2. Decide the smallest responsive contract for wide and tall desktop viewports, using Cloudinary transformations rather than modifying the source asset.
3. Add a focused failing regression to `app/tests/publicResponsiveLayout.test.js` before changing production code.
4. Run that focused test in a container and confirm it fails for the expected cropping contract.
5. Apply the minimal change to `app/src/pages/IndexPage.vue`.
6. Re-run the focused test, full test suite, lint, production build, dependency audit, and built-asset credential scan in a container. Do not install dependencies without explicit permission.
7. Visually verify representative viewport proportions, including 1920x1080 and compact layouts.
8. Create a detailed English commit on `develop`, push it, merge directly into `main` without a PR, validate the merged result, and push `main`.

## Repository state at pause

- No production or test file was changed for this responsive correction.
- No commit or push was created for this responsive correction.
- No merge related to this responsive correction was started.
- No OpenSpec change or issue was created.
- A temporary read-only copy of the public hero asset was used only to inspect intrinsic dimensions and was not added to Git.
- The only intended repository change from the paused turn is this handoff document.

## Continuation result

- The user approved preserving the complete source composition at every viewport size.
- The hero now uses Cloudinary `c_scale`, `f_auto`, and `q_auto` transformations with width candidates from 480px through 1920px.
- Intrinsic dimensions and `sizes="100vw"` provide stable browser layout and responsive candidate selection.
- Fixed hero heights and `object-fit: cover` were removed from desktop and compact layouts.
- A focused regression failed against the old implementation and passed after the minimal correction.
- The full suite passed with 317 tests across 20 suites.
- Lint, dependency audit, production build, and built-asset credential scan passed in an isolated container.
- Headless Firefox verification at 1920x1080 and 390x844 showed the complete hero composition without crop.
