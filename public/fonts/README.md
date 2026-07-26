# Self-hosted fonts

Drop the following `.woff2` files here to enable true self-hosting. Filenames must match exactly (referenced in `src/styles/typography.css`):

- `space-grotesk.woff2` — headings
- `inter.woff2` — body
- `ibm-plex-mono.woff2` — mono

## Sources

- Space Grotesk: https://fonts.google.com/specimen/Space+Grotesk (repo: https://github.com/floriankarsten/space-grotesk)
- Inter: https://fonts.google.com/specimen/Inter (repo: https://github.com/rsms/inter)
- IBM Plex Mono: https://fonts.google.com/specimen/IBM+Plex+Mono (repo: https://github.com/IBM/plex)

Convert/download the `woff2` weights you need and place them here.

## Behavior when absent

The `@font-face` rules use `font-display: swap` and each family has a robust
system fallback stack in `typography.css`. If a `.woff2` is missing the browser
simply uses the next family in the stack, so the layout stays stable and there
is no large layout shift.
