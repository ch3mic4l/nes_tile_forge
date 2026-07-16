# Repository Guidelines

## Project Structure & Module Organization

TileForge is a dependency-free browser app:

- `index.html` defines controls, the preview canvas, and export actions.
- `styles.css` contains layout and visual states.
- `app.js` owns conversion, perceptual palette reduction, dithering, pixel editing, NES binary imports, rendering, and exports.
- `README.md` documents user workflows and binary formats.

No asset or automated test directories exist. Do not commit exported `.chr`, `.nam`, `.pal`, or `.bin` files except as intentional fixtures.

## Build, Test, and Development Commands

No installation or build is required. From the repository root, run:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Avoid opening `index.html` directly when testing file and download behavior.

Check JavaScript syntax before committing:

```bash
node --check app.js
```

Use `git diff --check` to catch whitespace errors.

## Coding Style & Naming Conventions

Use two-space indentation in HTML, CSS, and JavaScript. Prefer `const` and `let`, semicolons, strict equality, and small functions named for their action, such as `renderPalette()` or `quantizeDiffusion()`. Use `camelCase` for JavaScript identifiers, `kebab-case` for CSS classes, and descriptive element IDs. Preserve the dependency-free design and standard browser APIs. Keep NES byte layouts and color-processing math explicit and commented when behavior is not obvious.

## Architecture & NES Data Rules

`data.indexed` is the editable source of truth: each byte is palette slot `0`–`3`. Rebuild preview RGBA, deduplicated CHR, nametable indices, usage percentages, and exports whenever indexed pixels change. Canvas dimensions must remain multiples of eight. CHR tiles are 16 bytes in 2bpp planar format, nametable bytes reference at most 256 unique tiles, and PAL export contains four NES color indices. Standard 1,024-byte NAM imports use 960 tile bytes; attribute editing is not supported.

## Testing Guidelines

No automated tests exist. Manually verify image upload and drag-and-drop; blank sprite/tileset creation; pencil, fill, pick, and clear tools; custom and preset sizes; 1×–32× zoom; palette editing and remapping; CHR/NAM/PAL imports; transparency-to-slot-00; all six processing modes and strength changes; and every export button. Confirm CHR tiles remain 16 bytes and remapping keeps preview colors, swatches, and usage percentages synchronized.

## Commit & Pull Request Guidelines

The existing history uses a short, imperative, title-style subject (`Build NES image converter`). Follow that pattern and keep each commit focused. Pull requests should explain user-visible behavior, list manual checks performed, and include before/after screenshots for interface changes. Link relevant issues and call out changes to CHR, nametable, palette, or bundle formats.
