## Group 5: Integrated Emoji Picker

The article editor now opens the pinned emoji picker on demand with the locally bundled Portuguese CLDR catalog and upstream Brazilian Portuguese labels. The picker retains the editor's visual styling and supplies search, categories, and skin-tone choices.

Insertion replaces the saved UTF-16 selection through the existing article body model. Multi-code-point emoji preserve their selected tone, return focus to the textarea, position the caret after the insertion, and activate the existing unsaved-navigation guard. Escape and the close button dismiss the panel without changing content. Loading failures keep ordinary editing available; late initialization neither reopens a dismissed panel nor steals focus from the textarea.

### Verification

- New utility and editor tests failed before implementation, then passed after integration.
- The full containerized Vitest run passed: 432 tests across 46 files.
- After that run, the single source-text layout assertion was replaced by three tests applying the compiled scoped CSS in the DOM environment at 320, 375, and 1440 pixels. All three passed. These exercise media-query selection, scrolling, picker width, and compact category sizing.
- Containerized ESLint passed, including after the final test update.
- Production build and built-asset credential scan passed. The build emits a separate picker chunk (13.01 KB gzip), translation chunk (0.58 KB gzip), and one Portuguese catalog asset (444.47 KB uncompressed).
- Independent review checked the installed picker API, database readiness, disconnect behavior, focus timing, and Unicode selection integration without identifying additional defects.

### Remaining Browser Verification

The DOM environment does not measure rendered geometry. Real browser checks for overflow, keyboard navigation through categories and skin tones, and complete authoring journeys remain in group 7, along with the release matrices and Deploy Preview validation. Group 6 browser policy and security contracts remain pending.
