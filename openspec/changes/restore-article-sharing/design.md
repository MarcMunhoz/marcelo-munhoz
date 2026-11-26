## Context

`BlogArticle.vue` uses a Quasar menu with six icon-only sharing entries. The component test checks that the menu opens. Opening the original menu in Chrome reproduced a rendering failure in `vue-socials` (`this.generateComponent is not a function`). The installed icon set includes both the solid and brand fonts. About renders its profile list from `socialNetwork.js`.

## Goals / Non-Goals

**Goals:** Preserve the styled menu, make each action discoverable, prefill supported fields, and remove the retired personal X profile.

**Non-Goals:** A native-only sharing sheet, an About redesign, and changes to article preview metadata or public APIs.

## Decisions

- Keep Quasar menu styling and use labeled, focusable actions with visible focus and pointer affordances. Check icon availability in the deployed font set. Keep labels independent from icon rendering.
- Use explicit destination links because the existing sharing components fail during browser rendering. Use the current X name and icon.
- Derive the share URL from the current article route so copy and direct sharing follow client-side navigation. Encode the URL, text, and hashtags once for each target's supported parameters.
- Show copy success only after the clipboard operation succeeds. Display the selectable article URL on failure. Email delegates composition to the configured handler.
- Remove the personal X record from the shared profile list and adjust the affected About test. Keep the X article action and preview metadata.

## Risks / Trade-offs

External services control which fields they accept, whether they require sign-in, and which UI they open. Validate the handoff and supported fields without publishing. Cover compact and desktop layouts and verify actual icons in a browser.
