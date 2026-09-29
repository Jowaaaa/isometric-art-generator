# Pixel to Iso

A client-side pixel art editor that remaps flat source pixels onto a crisp 2:1 isometric pixel lattice.

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
