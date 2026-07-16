# Repository Guidelines

## Project Structure & Module Organization

TileForge is a dependency-free browser application. Keep changes within the existing three-file structure unless a feature clearly benefits from a new module:

- `index.html` defines controls, the preview canvas, and export actions.
- `styles.css` contains the responsive layout and all visual states.
- `app.js` owns image conversion, NES palette handling, canvas rendering, and binary exports.

There is currently no asset directory, generated output, or automated test directory. Do not commit exported `.chr`, `.nam`, `.pal`, or `.bin` files unless they are intentional test fixtures.

## Build, Test, and Development Commands

No build step or package installation is required. Run a local server from the repository root:

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

Use two-space indentation in HTML, CSS, and JavaScript. Prefer `const` and `let`, semicolons, strict equality, and small functions named for their action, such as `renderPalette()` or `recolorPreview()`. Use `camelCase` for JavaScript identifiers, `kebab-case` for CSS classes, and descriptive element IDs. Preserve the dependency-free design and use standard browser APIs. Keep NES-specific constants and binary-format logic explicit and commented when byte layout is not obvious.

## Testing Guidelines

There is no test framework or coverage requirement yet. Manually verify image upload and drag-and-drop, custom and preset canvas sizes, palette editing, zoom and grid controls, and every export button. Confirm dimensions remain multiples of eight and test both clean-pixel and dithering modes. For conversion changes, inspect exported byte lengths and verify CHR tiles remain 16 bytes each.

## Commit & Pull Request Guidelines

The existing history uses a short, imperative, title-style subject (`Build NES image converter`). Follow that pattern and keep each commit focused. Pull requests should explain user-visible behavior, list manual checks performed, and include before/after screenshots for interface changes. Link relevant issues and call out changes to CHR, nametable, palette, or bundle formats.
