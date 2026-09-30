# Pixel to Iso

A client-side pixel art editor that remaps flat source pixels onto a crisp 2:1 isometric pixel lattice and builds frame-based animations for Godot.

## Run locally

```bash
npm install
npm run dev
```

Build for production with `npm run build`. Geometry tests run with `npm test`.

## Transformation

Each non-transparent source pixel at `(x, y)` is plotted at:

```text
isoX = 2 * (x - y)
isoY = x + y
```

The transformed bounds are normalized to crop the result. Rendering uses integer coordinates, disabled image smoothing, and nearest-neighbor display scaling. No CSS rotation, interpolation, or 3D geometry is used.

## Structure

- `src/App.tsx`: editor state, pointer tools, canvas rendering, import/export, and persistence.
- `src/lib/iso.ts`: pure flat-to-isometric conversion and grid utilities.
- `src/lib/drawing.ts`: Bresenham strokes and four-way flood fill.
- `src/lib/iso.test.ts`: known-coordinate geometry tests.
- `src/styles.css`: responsive dark utility UI.

## Animation and Godot export

Use the animation timeline to add blank frames, duplicate the current frame, reorder frames, and play the animation. FPS, depth, grid size, palette, and mirror settings are shared by all frames. Each frame keeps its own pixel grid and is saved locally.

`Export sprites` creates a transparent multi-row sprite sheet with equal-sized frame cells, plus a JSON manifest. Each named animation occupies one row; shorter animations leave unused cells transparent. For example, a six-frame walk animation and an eight-frame shoot animation become two rows with eight columns.

The export controls support output scale and transparent cell padding. Import the PNG into Godot and configure a `Sprite2D` or `AnimatedSprite2D` with:

- `hframes`: the longest animation frame count
- `vframes`: the number of named animations
- Texture filter: nearest / no filtering

The JSON manifest contains each animation name, row, frame count, FPS, loop setting, and exact frame rectangles for custom Godot `SpriteFrames` setup. Frames use stable uncropped bounds so the animation remains aligned while transparent pixels remain transparent.
