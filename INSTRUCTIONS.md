# Build a Pixel Art → Isometric Pixel Art Web App

Build a polished, simple browser-based pixel art editor that lets a user:

1. Draw normal flat pixel art on a square grid.
2. See that artwork converted in real time to a **2:1 isometric pixel-art projection**.
3. Export the resulting isometric pixel art as a crisp PNG.

The app should be fast, minimal, easy to understand, and work entirely client-side.

---

# 1. Core Concept

This is NOT:

- a voxel editor
- a 3D renderer
- a cube generator
- a tool that replaces every pixel with a diamond
- a perspective transform
- a rotated/scaled raster image

The user draws ordinary square pixel art.

Example source:

```text
████████
██    ██
██ ██ ██
██    ██
████████
```

The application then remaps the source pixels onto a classic **2:1 isometric pixel grid**.

The important geometric rule is:

**2 horizontal pixels for every 1 vertical pixel of diagonal movement.**

For a source pixel coordinate:

```text
(x, y)
```

use the basic mapping:

```text
isoX = (x - y) * 2
isoY = x + y
```

Then apply an offset so the transformed artwork is centered inside the destination canvas.

Do not use CSS transforms to fake the result.

Generate the isometric artwork pixel-by-pixel.

There must be:

- no interpolation
- no anti-aliasing
- no blur
- no smoothing

The output needs to remain genuine hard-edged pixel art.

---

# 2. Main Interface

Use a two-panel desktop layout.

```text
┌─────────────────────────────────────────────────────────────┐
│  PIXEL → ISO                              Export PNG        │
├───────────────────────────┬─────────────────────────────────┤
│                           │                                 │
│       FLAT EDITOR         │        ISOMETRIC PREVIEW        │
│                           │                                 │
│       ▦ ▦ ▦ ▦ ▦           │              ▪▪                 │
│       ▦ ▦ ▦ ▦ ▦           │           ▪▪    ▪▪              │
│       ▦ ▦ ▦ ▦ ▦           │        ▪▪          ▪▪           │
│                           │                                 │
├───────────────────────────┴─────────────────────────────────┤
│ Pencil | Eraser | Fill | Color | Grid | Undo | Redo       │
└─────────────────────────────────────────────────────────────┘
```

On smaller screens, stack the editor and preview vertically.

The interface should feel like a small dedicated creative tool, not an admin dashboard.

---

# 3. Flat Pixel Editor

Create a pixel-art drawing canvas.

Default grid:

```text
16 × 16
```

Also support:

```text
8 × 8
16 × 16
24 × 24
32 × 32
48 × 48
64 × 64
```

Represent the artwork internally as a 2D array.

For example:

```js
pixels[y][x]
```

Each cell should contain either:

```js
null
```

for transparent pixels or a color such as:

```js
"#ff3366"
```

The logical pixel array should be the source of truth.

Do not treat the visible HTML canvas itself as the underlying artwork data.

---

# 4. Drawing Tools

Implement:

### Pencil

Click or drag to paint pixels using the selected color.

### Eraser

Click or drag to set pixels back to transparent.

### Fill

Flood-fill connected pixels of the same color.

Use four-direction connectivity:

```text
up
down
left
right
```

Do not include diagonal neighbors.

### Eyedropper

Click an existing pixel to make its color the active color.

Optional shortcut:

```text
Alt + click
```

### Clear

Clear the entire canvas after a lightweight confirmation.

---

# 5. Drawing Behavior

Drawing should feel responsive.

Support click-and-drag painting.

When the pointer moves quickly, interpolate between the previous grid coordinate and the current coordinate so pixels are not accidentally skipped.

Use a simple integer line algorithm such as Bresenham's line algorithm.

Do the same for the eraser.

Disable browser text selection and unwanted touch gestures while drawing.

Support mouse, stylus, and touch through Pointer Events.

---

# 6. Color Controls

Provide:

- native color picker
- current-color swatch
- small reusable palette

Start with a useful default palette containing:

- black
- white
- gray
- red
- orange
- yellow
- green
- cyan
- blue
- purple
- pink

Allow recently used colors to appear in the palette.

Transparency should be controlled through the eraser rather than represented as a normal paint color.

---

# 7. Grid Display

The editor should visually show grid cells.

Provide a toggle:

```text
Grid: On / Off
```

The grid is editor UI only.

It must NEVER appear in exported images.

The editor should automatically scale to fit the available space while maintaining perfectly square cells.

---

# 8. Real-Time Isometric Conversion

The right-hand preview should update immediately whenever the source artwork changes.

Do not require the user to click a Convert button.

For every non-transparent source pixel:

```js
for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        const color = pixels[y][x];

        if (!color) continue;

        const isoX = (x - y) * 2;
        const isoY = x + y;

        // plot pixel at transformed coordinate
    }
}
```

Because `isoX` can become negative, calculate the transformed bounding box before rendering.

Determine:

```text
minIsoX
maxIsoX
minIsoY
maxIsoY
```

Then offset coordinates:

```js
drawX = isoX - minIsoX;
drawY = isoY - minIsoY;
```

This guarantees the entire image fits inside the output buffer.

---

# 9. Important: Preserve Pixel Structure

The output must remain raster pixel art.

Do NOT render:

```text
◇
```

for every pixel.

Do NOT turn every source pixel into an isometric tile.

Do NOT add automatic cube faces.

Instead, pixels are plotted onto the 2:1 isometric coordinate system.

Think of it as remapping the source pixel coordinates onto an isometric pixel lattice.

The result should resemble manually constructed classic isometric pixel art.

---

# 10. Collision Handling

Because coordinates are being transformed, verify whether multiple source pixels can map to the same destination pixel under the chosen transform.

The mapping:

```text
isoX = 2(x - y)
isoY = x + y
```

is mathematically invertible for integer source coordinates, so valid source coordinates should remain uniquely identifiable.

Still implement rendering deterministically.

Render source pixels in consistent row-major order:

```text
y first
x second
```

---

# 11. Preview Scaling

The actual isometric image may be tiny.

Render it first to a logical offscreen canvas at native pixel resolution.

Then display that canvas enlarged using nearest-neighbor rendering.

Set:

```css
image-rendering: pixelated;
```

and:

```js
ctx.imageSmoothingEnabled = false;
```

Never scale the underlying artwork using interpolation.

Provide preview zoom controls such as:

```text
1×
2×
4×
8×
Fit
```

Zoom should only affect the preview display.

It must not alter the underlying image.

---

# 12. Transparent Background

Transparent pixels should remain transparent.

Show transparency in the UI using a checkerboard background.

The checkerboard is UI only.

It must not appear in the PNG export.

Optionally allow the user to choose between:

```text
Transparent
White
Black
Custom background
```

for export.

Default:

```text
Transparent
```

---

# 13. Undo / Redo

Implement undo and redo.

Actions that should create history states:

- pencil stroke
- eraser stroke
- fill
- clear
- grid resize/import where appropriate

Treat one continuous pointer drag as ONE undo action rather than creating an undo state for every painted pixel.

Keyboard shortcuts:

```text
Ctrl/Cmd + Z       Undo
Ctrl/Cmd + Shift+Z Redo
```

Optionally support:

```text
Ctrl/Cmd + Y
```

for redo.

---

# 14. Export

Provide:

```text
Export PNG
```

The PNG should contain the actual isometric result.

Requirements:

- exact pixel colors
- transparent background by default
- no editor grid
- no UI
- no anti-aliasing
- tightly cropped to artwork bounds

Also provide:

```text
Export Flat PNG
```

for the original artwork.

If useful, provide an export scale:

```text
1×
2×
4×
8×
```

When exporting at larger sizes, enlarge every logical pixel into an exact integer block.

For example, at 4× scale:

```text
1 logical pixel → 4 × 4 physical pixels
```

Never use bilinear filtering.

---

# 15. Import PNG

Add:

```text
Import PNG
```

Allow users to import a small pixel-art PNG into the flat editor.

Preserve transparency.

If the imported image exceeds the supported dimensions, either:

1. offer to resize the logical grid to fit it, or
2. reject it with a clear explanation.

Never automatically blur or resample pixel art.

If resizing is implemented, use nearest-neighbor only.

---

# 16. Grid Resizing

Allow changing the flat canvas dimensions.

Support square presets first.

Changing from 16×16 to 32×32 should preserve the existing artwork rather than scale it.

Place the old artwork at the top-left or, preferably, centered inside the new grid.

When shrinking the grid, warn if painted pixels will be removed.

---

# 17. Optional Mirror Controls

Useful pixel-art features:

```text
Mirror X
Mirror Y
```

When enabled, drawing one pixel automatically paints its mirrored counterpart.

These controls affect the flat editor only.

The isometric preview then updates normally from the resulting source pixels.

---

# 18. Architecture

Keep the app simple.

Preferred stack:

```text
React
TypeScript
Vite
HTML Canvas
CSS
```

Avoid unnecessary dependencies.

Do not use a 3D library.

Do not use Three.js.

Do not use WebGL unless there is an actual performance reason.

HTML Canvas is sufficient.

Suggested structure:

```text
src/
  App.tsx

  components/
    PixelEditor.tsx
    IsoPreview.tsx
    Toolbar.tsx
    ColorPalette.tsx
    ExportControls.tsx

  lib/
    iso.ts
    drawing.ts
    floodFill.ts
    export.ts
    history.ts

  types/
    pixel.ts

  styles/
    app.css
```

---

# 19. Data Model

Use something similar to:

```ts
type PixelColor = string | null;

type PixelGrid = PixelColor[][];

interface EditorState {
    width: number;
    height: number;
    pixels: PixelGrid;
    selectedColor: string;
    tool: "pencil" | "eraser" | "fill" | "eyedropper";
}
```

Keep transformation logic independent from React.

For example:

```ts
interface IsoPixel {
    x: number;
    y: number;
    color: string;
}

function convertToIsometric(
    pixels: PixelGrid
): IsoPixel[] {
    // transformation
}
```

This makes the conversion easy to test.

---

# 20. Isometric Conversion Utility

Create a dedicated pure function.

Conceptually:

```ts
function flatToIso(grid: PixelGrid) {
    const result = [];

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            const color = grid[y][x];

            if (color === null) continue;

            result.push({
                x: (x - y) * 2,
                y: x + y,
                color,
            });
        }
    }

    // Normalize negative coordinates.

    const minX = Math.min(...result.map(p => p.x));
    const minY = Math.min(...result.map(p => p.y));

    return result.map(pixel => ({
        ...pixel,
        x: pixel.x - minX,
        y: pixel.y - minY,
    }));
}
```

Handle an entirely empty canvas without calling `Math.min()` on an empty array.

---

# 21. Test the Geometry

Create automated tests for several known coordinates.

Examples:

```text
flat (0,0)
→ iso (0,0)

flat (1,0)
→ iso (2,1)

flat (0,1)
→ iso (-2,1)

flat (1,1)
→ iso (0,2)

flat (2,0)
→ iso (4,2)

flat (0,2)
→ iso (-4,2)
```

Before normalization, the coordinate pattern should therefore look like:

```text
            (0,0)

      (-2,1)     (2,1)

(-4,2)     (0,2)     (4,2)
```

This 2-horizontal-to-1-vertical relationship is fundamental to the application.

Do not accidentally implement a 1:1 diagonal.

---

# 22. Visual Design

Use a clean, modern dark interface.

Think:

```text
small professional pixel-art utility
```

rather than:

```text
large SaaS dashboard
```

Use:

- dark charcoal background
- slightly lighter panels
- thin subtle borders
- compact controls
- monospace or pixel-inspired labels where appropriate
- one restrained accent color
- rounded corners, but not excessively rounded
- clear hover/active states

The artwork should visually dominate the interface.

Avoid gradients and decorative clutter.

---

# 23. Editor Appearance

The editor canvas should sit inside a centered workspace.

Transparent cells can use a subtle checkerboard.

Example:

```text
┌──────────────────────┐
│ ░░▓▓░░░░▓▓░░░░▓▓░░ │
│ ▓▓░░▓▓▓▓░░▓▓▓▓░░▓▓ │
│ ░░▓▓░░░░▓▓░░░░▓▓░░ │
│ ...                  │
└──────────────────────┘
```

Grid lines should remain subtle enough that the artwork is easy to see.

---

# 24. Isometric Preview Appearance

Center the generated result in a large preview area.

The preview background should use the same transparency checkerboard.

Allow:

```text
Fit
+
-
```

for zoom.

The preview must stay pixel-perfect at every integer zoom level.

Display useful metadata underneath:

```text
Source: 16 × 16
Iso bounds: 61 × 31
Zoom: 8×
```

Calculate the actual dimensions rather than hardcoding them.

---

# 25. Responsive Behavior

Desktop:

```text
Flat Editor | Iso Preview
```

Mobile:

```text
Flat Editor

Iso Preview
```

Keep drawing controls accessible on touch screens.

Buttons should have sufficiently large touch targets.

Prevent page scrolling while the user is actively drawing on the canvas, but do not unnecessarily disable normal page scrolling elsewhere.

---

# 26. Local Persistence

Automatically save the current drawing using:

```text
localStorage
```

Save:

- dimensions
- pixel data
- palette
- selected color

Restore the last drawing when the application opens again.

Provide:

```text
New
```

to intentionally reset the project.

---

# 27. Performance

The app should comfortably handle at least:

```text
64 × 64
```

pixel grids.

Avoid React state updates for every mousemove if that creates unnecessary rendering overhead.

Canvas rendering can happen imperatively while the logical pixel grid remains the source of truth.

The isometric preview should still feel instantaneous.

---

# 28. Accessibility

Give toolbar buttons accessible labels.

Do not rely exclusively on icons.

Provide keyboard shortcuts where sensible.

Ensure active tools are visually distinguishable.

Color selection should expose the actual hex value.

---

# 29. MVP Priority

Implement features in this order:

1. Flat pixel grid
2. Pencil drawing
3. Eraser
4. Color picker
5. Correct 2:1 isometric conversion
6. Live isometric preview
7. Pixel-perfect zoom
8. PNG export
9. Undo/redo
10. Fill
11. Eyedropper
12. Grid sizes
13. Local persistence
14. PNG import
15. Polish/responsive UI

Do not spend time implementing secondary features before the basic transformation is demonstrably correct.

---

# 30. Acceptance Test

The application is successful when I can:

1. Open the website.
2. See an empty 16×16 flat pixel canvas.
3. Select a color.
4. Draw several pixels.
5. Immediately see those pixels appear in the isometric preview.
6. Verify that movement along the transformed diagonal follows a 2-horizontal-to-1-vertical pixel ratio.
7. Erase pixels and see the preview update.
8. Undo a drawing stroke.
9. Export the isometric image.
10. Open the exported PNG and see crisp, hard-edged pixels with transparency and no grid/UI.

---

# 31. Critical Requirement

The most important part of this project is the transformation.

Do not reinterpret "isometric pixel art" as automatically generating cubes or diamond-shaped tiles.

The intended transformation is:

```text
FLAT PIXEL COORDINATE

(x, y)

↓

2:1 ISOMETRIC COORDINATE

isoX = 2 * (x - y)
isoY = x + y
```

The flat image's pixels are repositioned onto this coordinate system.

Everything must remain integer-aligned and pixel-perfect.

No interpolation.

No anti-aliasing.

No CSS rotation.

No fake perspective.

No automatic 3D geometry.

---

# 32. Final Deliverable

Produce a complete working project that can be run with:

```bash
npm install
npm run dev
```

Also ensure:

```bash
npm run build
```

completes successfully.

Include a concise README containing:

- installation
- development command
- production build command
- explanation of the 2:1 coordinate transformation
- project structure

Before considering the task finished, manually verify the transformation using a simple 3×3 test drawing and confirm the generated coordinates match the expected 2:1 geometry.

Prioritize correctness, simplicity, responsiveness, and pixel-perfect rendering over adding extra features.