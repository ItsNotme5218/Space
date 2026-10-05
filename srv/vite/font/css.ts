// Nebula-inspired root-local presentation; AGPL-3.0, see NOTICE.md.
// Original React text is never replaced. CSS generated content is presentation
// only; / "" prevents duplicate generated-content accessible names in Chromium.
export const cssContent = `
[data-space-font] { font-size: 0 !important; display: var(--space-font-display) !important; }
[data-space-font]::after {
  content: attr(data-space-font) / "";
  font-family: 'SpacePresentation', sans-serif;
  font-size: var(--space-font-size);
  font-variant-ligatures: none;
  letter-spacing: normal;
}
`;
