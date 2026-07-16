# TileForge

TileForge is a dependency-free browser tool that converts images into NES-ready background graphics. It reduces an image to four NES palette colors, divides it into 8×8 tiles, removes duplicate tiles, and exports the result as CHR, nametable, and palette data.

## Features

- Upload or drag and drop PNG, JPG, GIF, and WebP images
- Use standard NES canvas presets or custom dimensions
- Crop to fill or fit the source image inside the canvas
- Choose clean pixel conversion or ordered dithering
- Edit all four NES palette slots without changing pixel assignments
- Inspect palette-slot usage percentages
- Preview pixels at 1×–8× zoom with an optional 8×8 grid
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

1. Choose an image or drop one onto the preview area.
2. Select a canvas preset or enter custom dimensions in multiples of eight.
3. Adjust crop, dithering, and palette options.
4. Use the zoom and grid controls to inspect the converted result.
5. Download the files required by your NES project.

Changing a palette color recolors pixels already assigned to that slot. Select **Convert image** to calculate new slot assignments from the source image.

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
- `app.js` — conversion, preview rendering, palette logic, and exports
- `AGENTS.md` — contributor guidelines

## Development

Check JavaScript syntax and whitespace before submitting changes:

```bash
node --check app.js
git diff --check
```

There is no automated test suite yet. Manually test upload, resizing, palette editing, zoom, grid display, dithering, and all four export actions.
