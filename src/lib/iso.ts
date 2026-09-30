export type PixelColor = string | null
export type PixelGrid = PixelColor[][]

export interface IsoPixel { x: number; y: number; color: string }
export interface IsoImage { pixels: IsoPixel[]; width: number; height: number }

function shade(color: string, amount: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color
  const channels = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16))
  return `#${channels.map((channel) => Math.max(0, Math.min(255, Math.round(channel * amount))).toString(16).padStart(2, '0')).join('')}`
}

/**
 * Projects pixels onto the 2:1 lattice. With depth enabled, each projected
 * pixel becomes a dense 2x2 raster block and the silhouette is extruded along
 * the isometric down-right vector before the front face is drawn over it.
 */
export function flatToIso(grid: PixelGrid, depth = 0, crop = true): IsoImage {
  const pixels: IsoPixel[] = []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  const add = (x: number, y: number, color: string) => {
    pixels.push({ x, y, color })
    minX = Math.min(minX, x); minY = Math.min(minY, y)
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
  }

  const addBlock = (x: number, y: number, color: string) => {
    if (depth <= 0) add(x, y, color)
    else {
      add(x, y, color); add(x + 1, y, color)
      add(x, y + 1, color); add(x + 1, y + 1, color)
    }
  }

  const sourcePixels: Array<{ x: number; y: number; color: string; sourceX: number; sourceY: number }> = []

  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < (grid[y]?.length ?? 0); x += 1) {
      const color = grid[y][x]
      if (!color) continue
      const isoX = depth <= 0 ? (x - y) * 2 : x * 2
      const isoY = depth <= 0 ? x + y : x + y * 2
      sourcePixels.push({ x: isoX, y: isoY, color, sourceX: x, sourceY: y })
      if (depth <= 0) add(isoX, isoY, color)
    }
  }

  if (!sourcePixels.length && crop) return { pixels: [], width: 0, height: 0 }

  if (depth > 0) {
    // Draw the farthest layers first so the front face remains crisp and on top.
    for (let layer = depth; layer >= 1; layer -= 1) {
      for (const pixel of sourcePixels) {
        const x = pixel.x + layer * 2
        const y = pixel.y - layer
        // The far volume is dark; exposed top and right edges get their own light.
        addBlock(x, y, shade(pixel.color, 0.48))
        const above = grid[pixel.sourceY - 1]?.[pixel.sourceX]
        const right = grid[pixel.sourceY]?.[pixel.sourceX + 1]
        if (!above) addBlock(x, y, shade(pixel.color, 0.78))
        if (!right) addBlock(x, y, shade(pixel.color, 0.36))
      }
    }
    for (const pixel of sourcePixels) addBlock(pixel.x, pixel.y, pixel.color)
  }

  if (!crop) {
    const width = grid[0]?.length ?? 0
    const height = grid.length
    if (depth > 0) {
      minX = 0
      minY = -depth
      maxX = Math.max(0, (width - 1) * 2 + depth * 2 + 1)
      maxY = Math.max(0, (width - 1) + (height - 1) * 2 + 1)
    } else {
      minX = -(height - 1) * 2
      minY = 0
      maxX = Math.max(0, (width - 1) * 2)
      maxY = Math.max(0, width + height - 2)
    }
  }

  return {
    pixels: pixels.map((pixel) => ({ ...pixel, x: pixel.x - minX, y: pixel.y - minY })),
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

export function makeGrid(size: number): PixelGrid {
  return Array.from({ length: size }, () => Array<PixelColor>(size).fill(null))
}
