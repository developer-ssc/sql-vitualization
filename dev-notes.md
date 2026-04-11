## Verification notes

- The live preview renders the Cartographic Workshop interface correctly with the SQL sample loaded.
- The parser detects 3 tables, 19 columns, and 2 relationships from the sample schema.
- The ER workspace, schema inspection view, Mermaid source view, and editable SQL panel are all present in the interface.
- A GitHub Pages-style build succeeded with `GITHUB_PAGES=true pnpm exec vite build`.
- Build warning: Mermaid contributes large JS chunks, but the static build completes successfully and produces deployable assets.
