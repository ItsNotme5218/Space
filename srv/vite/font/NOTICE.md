# Space font tooling

Adapted 2026-09-30 from Nebula contributors' `build/font/index.ts`,
`build/font/runtime.js`, `build/font/css.ts` and `src/layouts/Layout.astro`
working-tree changes, against Nebula HEAD e46384e0d790b551041a90833b5f39bb231724cf.
Nebula and Space license: GNU AGPL version 3 (full text in Space root `LICENSE`).
No warranty. This is font presentation, not encryption or a security boundary.

Space modifications: private-use codepoints instead of CJK, ASCII glyph set,
normalized sfnt timestamps/checksums, content-addressed mapping and WOFF2,
strict build failure, shadow-root-local styles and CSS presentation of leaf labels.
No Astro hooks, global DOM prototype patches, input/placeholder/title encoding,
clipboard interception, sibling imports, or source-text mutations are retained.

Roboto Regular 2.001047 (2015), copied from the inspected Nebula asset:
Copyright 2015 Google Inc. All Rights Reserved. Designer: Christian Robertson.
Font's embedded license explicitly states Apache License version 2.0.
Roboto is a trademark of Google. See `public/ttf/LICENSE.txt` and `NOTICE.txt`.
Generated subset fonts are modified derivatives, renamed SpacePresentation.
