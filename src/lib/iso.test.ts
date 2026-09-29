import { describe, expect, it } from 'vitest'
import { flatToIso } from './iso'

describe('flatToIso', () => {
  it('maps the 3x3 coordinate pattern with a 2:1 slope', () => {
    const grid = Array.from({ length: 3 }, (_, y) => Array.from({ length: 3 }, (_, x) => `${x},${y}`))
    const result = flatToIso(grid)
    expect(result.pixels.find((p) => p.color === '0,0')).toMatchObject({ x: 4, y: 0 })
    expect(result.pixels.find((p) => p.color === '1,0')).toMatchObject({ x: 6, y: 1 })
    expect(result.pixels.find((p) => p.color === '0,1')).toMatchObject({ x: 2, y: 1 })
    expect(result.pixels.find((p) => p.color === '1,1')).toMatchObject({ x: 4, y: 2 })
    expect(result.width).toBe(9)
    expect(result.height).toBe(5)
  })
  it('handles empty grids without invalid bounds', () => { expect(flatToIso([[null]])).toEqual({ pixels: [], width: 0, height: 0 }) })
})
