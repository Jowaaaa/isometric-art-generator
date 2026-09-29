import type { PixelGrid, PixelColor } from './iso'

export function lineBetween(x0: number, y0: number, x1: number, y1: number): Array<[number, number]> {
  const points: Array<[number, number]> = []
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1
  let error = dx + dy
  while (true) {
    points.push([x0, y0])
    if (x0 === x1 && y0 === y1) break
    const twice = 2 * error
    if (twice >= dy) { error += dy; x0 += sx }
    if (twice <= dx) { error += dx; y0 += sy }
  }
  return points
}

export function floodFill(grid: PixelGrid, startX: number, startY: number, replacement: PixelColor): PixelGrid {
  const height = grid.length, width = grid[0]?.length ?? 0
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) return grid
  const target = grid[startY][startX]
  if (target === replacement) return grid
  const next = grid.map((row) => [...row])
  const queue: Array<[number, number]> = [[startX, startY]]
  next[startY][startX] = replacement
  for (let i = 0; i < queue.length; i += 1) {
    const [x, y] = queue[i]
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx >= 0 && ny >= 0 && nx < width && ny < height && next[ny][nx] === target) {
        next[ny][nx] = replacement; queue.push([nx, ny])
      }
    }
  }
  return next
}
