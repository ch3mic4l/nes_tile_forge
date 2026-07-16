# TileForge

TileForge is a dependency-free browser tool for converting images and drawing editable NES tiles, sprites, and background graphics. It reduces an image to four NES palette colors, divides it into 8×8 tiles, removes duplicate tiles, and exports the result as CHR, nametable, and palette data.

## Features

- Upload or drag and drop PNG, JPG, GIF, and WebP images
- Create blank 8×8, 16×16, or 32×32 sprites and 128×128 tilesets
- Draw with pencil and fill tools, pick colors from the canvas, or clear to slot 00
- Import `.chr`, `.nam`, and `.pal` files for visual editing
- Use standard NES canvas presets or custom dimensions
- Crop to fill or fit the source image inside the canvas
- Choose clean pixels, Bayer, pattern, Floyd–Steinberg, or Atkinson processing
- Adjust dither strength and map transparent source pixels to palette slot 00
- Edit all four NES palette slots without changing pixel assignments
- Inspect palette-slot usage percentages
- Preview pixels at 1×–32× zoom with an optional 8×8 grid
- Export individual files or a combined binary bundle
- Detect output that exceeds one 256-tile CHR bank

## Run Locally

TileForge has no packages to install and no build step. Clone the repository and serve its root directory:

```bash
git clone git@github.com:ch3mic4l/nes_tile_forge.git
cd nes_tile_forge
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in a modern browser.

## Usage

1. Choose an image, start from a blank sprite or tileset template, or import NES files.
2. Select a canvas preset or enter custom dimensions in multiples of eight.
3. Select a palette slot and paint with the pencil or fill tool. Right-click paints slot 00.
4. Adjust conversion, palette, zoom, and grid options as needed.
5. Download the files required by your NES project.

## Color Processing

All modes match colors in CIE Lab perceptual color space before assigning one of the four NES palette slots.

| Mode | Behavior |
| --- | --- |
| Clean pixels | Chooses the nearest palette color without adding texture |
| Bayer 2×2 | Uses a compact, regular ordered pattern |
| Bayer 4×4 | Uses a finer ordered pattern for smoother gradients |
| Floyd–Steinberg | Diffuses color error for detailed, smoother results |
| Atkinson | Applies lighter error diffusion for a softer retro look |
| Pattern dithering | Uses deliberate checkerboard-style color mixing |

The strength control changes the ordered pattern or amount of distributed error. At 0%, processing approaches clean pixels. Enable **Transparent pixels use slot 00** when preparing sprites or images with alpha.

## Palette, Editing, and Imports

Changing a palette color recolors pixels already assigned to that slot. Select **Remap image to palette** to regenerate the best four NES colors from the source image and calculate new slot assignments. The palette swatches, canvas, and usage percentages update together.

CHR files open as editable tile sheets. Import a NAM file as well to reconstruct its mapped canvas; the files can be selected in either order. Standard 1,024-byte nametables use their first 960 tile-map bytes. Their 64 attribute bytes are reported but are not edited because TileForge currently uses one four-color palette for the whole canvas. PAL files may contain additional colors, but this editor applies the first four bytes.

## Export Formats

| Export | Contents |
| --- | --- |
| `tiles.chr` | Deduplicated 8×8 tiles in NES 2bpp planar format; 16 bytes per tile |
| `nametable.nam` | Row-major tile indices referencing `tiles.chr` |
| `palette.pal` | Four NES palette indices, one byte per slot |
| `nes-graphics.bin` | CHR bytes, followed by nametable bytes, followed by four palette bytes |

Exports are disabled when conversion produces more than 256 unique tiles, because a nametable byte cannot address additional tiles in a single CHR bank.

## Project Files

- `index.html` — application markup and controls
- `styles.css` — layout, responsive styles, and visual states
- `app.js` — perceptual conversion, dithering, drawing, NES imports, palette logic, and exports
- `AGENTS.md` — contributor guidelines

## Development

Check JavaScript syntax and whitespace before submitting changes:

```bash
node --check app.js
git diff --check
```

There is no automated test suite yet. Manually test upload, drawing tools, resizing, CHR/NAM/PAL imports, palette editing and remapping, zoom, grid display, all six processing modes, transparency handling, and every export action.
