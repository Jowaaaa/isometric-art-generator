import { useCallback, useEffect, useRef, useState } from 'react'
import { floodFill, lineBetween } from './lib/drawing'
import { flatToIso, makeGrid, type PixelColor, type PixelGrid } from './lib/iso'

type Tool = 'pencil' | 'eraser' | 'fill' | 'eyedropper'
interface AnimationTrack { id: string; name: string; frames: PixelGrid[]; fps: number; loop: boolean }
const SIZES = [8, 16, 24, 32, 48, 64]
const BASE_PALETTE = ['#111318', '#f4f1ea', '#777b86', '#e84a5f', '#f28c28', '#f5c542', '#53b56b', '#4dc9c0', '#4f7cff', '#9b65d1', '#ef78a8']
const STORAGE_KEY = 'pixel-to-iso-project'

function cloneGrid(grid: PixelGrid): PixelGrid { return grid.map((row) => [...row]) }
function drawChecker(ctx: CanvasRenderingContext2D, width: number, height: number, cell = 12) {
  ctx.fillStyle = '#20232b'; ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#292d36'
  for (let y = 0; y < height; y += cell) for (let x = 0; x < width; x += cell) if ((x / cell + y / cell) % 2 === 0) ctx.fillRect(x, y, cell, cell)
}

function App() {
  const [animations, setAnimations] = useState<AnimationTrack[]>(() => [{ id: 'animation-1', name: 'Animation 1', frames: [makeGrid(16)], fps: 8, loop: true }])
  const [currentAnimation, setCurrentAnimation] = useState(0)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [size, setSize] = useState(16)
  const [depth, setDepth] = useState(4)
  const [color, setColor] = useState('#e84a5f')
  const [palette, setPalette] = useState(BASE_PALETTE)
  const [tool, setTool] = useState<Tool>('pencil')
  const [gridOn, setGridOn] = useState(true)
  const [mirrorX, setMirrorX] = useState(false)
  const [mirrorY, setMirrorY] = useState(false)
  const [zoom, setZoom] = useState(4)
  const [exportScale, setExportScale] = useState(1)
  const [exportPadding, setExportPadding] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [history, setHistory] = useState<PixelGrid[]>([])
  const [future, setFuture] = useState<PixelGrid[]>([])
  const [drawing, setDrawing] = useState(false)
  const lastCell = useRef<[number, number] | null>(null)
  const strokeStart = useRef<PixelGrid | null>(null)
  const editorRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const animation = animations[currentAnimation] ?? animations[0]
  const frames = animation?.frames ?? [makeGrid(size)]
  const fps = animation?.fps ?? 8
  const loop = animation?.loop ?? true
  const grid = frames[currentFrame] ?? frames[0] ?? makeGrid(size)
  const gridRef = useRef(grid)
  const iso = flatToIso(grid, depth, false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try { const data = JSON.parse(saved); const savedAnimations: AnimationTrack[] = Array.isArray(data.animations) ? data.animations : Array.isArray(data.frames) ? [{ id: 'animation-1', name: 'Animation 1', frames: data.frames, fps: data.fps ?? 8, loop: data.loop ?? true }] : Array.isArray(data.pixels) ? [{ id: 'animation-1', name: 'Animation 1', frames: [data.pixels], fps: 8, loop: true }] : []; if (savedAnimations.length && data.width) { setAnimations(savedAnimations); setCurrentAnimation(Math.min(data.currentAnimation ?? 0, savedAnimations.length - 1)); setCurrentFrame(data.currentFrame ?? 0); setSize(data.width); setDepth(Number.isFinite(data.depth) ? data.depth : 4); setExportScale(Number.isFinite(data.exportScale) ? data.exportScale : 1); setExportPadding(Number.isFinite(data.exportPadding) ? data.exportPadding : 0); setColor(data.color ?? color); setPalette(data.palette ?? BASE_PALETTE) } } catch { localStorage.removeItem(STORAGE_KEY) }
  }, [])
  useEffect(() => { gridRef.current = grid; localStorage.setItem(STORAGE_KEY, JSON.stringify({ width: size, depth, animations, currentAnimation, currentFrame, exportScale, exportPadding, color, palette })) }, [grid, animations, currentAnimation, currentFrame, size, depth, exportScale, exportPadding, color, palette])

  const replaceCurrentGrid = (next: PixelGrid) => {
    gridRef.current = next
    setAnimations((items) => items.map((item, index) => index === currentAnimation ? { ...item, frames: item.frames.map((frame, frameIndex) => frameIndex === currentFrame ? next : frame) } : item))
  }
  const updateAnimation = (updater: (item: AnimationTrack) => AnimationTrack) => setAnimations((items) => items.map((item, index) => index === currentAnimation ? updater(item) : item))

  const renderEditor = useCallback(() => {
    const canvas = editorRef.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.floor(rect.width * dpr)); canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    const ctx = canvas.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false
    const cell = Math.min(rect.width, rect.height) / size; const left = (rect.width - cell * size) / 2; const top = (rect.height - cell * size) / 2
    drawChecker(ctx, rect.width, rect.height)
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) if (grid[y][x]) { ctx.fillStyle = grid[y][x]!; ctx.fillRect(left + x * cell, top + y * cell, cell, cell) }
    if (gridOn) { ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i <= size; i += 1) { const p = Math.round(left + i * cell) + .5; ctx.moveTo(p, top); ctx.lineTo(p, top + size * cell); ctx.moveTo(left, Math.round(top + i * cell) + .5); ctx.lineTo(left + size * cell, Math.round(top + i * cell) + .5) } ctx.stroke() }
  }, [grid, gridOn, size])
  const renderPreview = useCallback(() => {
    const canvas = previewRef.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.floor(rect.width * dpr)); canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    const ctx = canvas.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false; drawChecker(ctx, rect.width, rect.height)
    if (!iso.width) return
    const fit = Math.max(1, Math.floor(Math.min((rect.width - 56) / iso.width, (rect.height - 56) / iso.height)))
    const scale = zoom === 0 ? fit : zoom; const left = Math.floor((rect.width - iso.width * scale) / 2); const top = Math.floor((rect.height - iso.height * scale) / 2)
    for (const pixel of iso.pixels) { ctx.fillStyle = pixel.color; ctx.fillRect(left + pixel.x * scale, top + pixel.y * scale, scale, scale) }
  }, [iso, zoom])
  useEffect(() => { renderEditor(); renderPreview(); const onResize = () => { renderEditor(); renderPreview() }; window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize) }, [renderEditor, renderPreview])

  const commit = (next: PixelGrid) => { setHistory((items) => [...items.slice(-39), cloneGrid(grid)]); setFuture([]); replaceCurrentGrid(next) }
  const paint = (x: number, y: number) => {
    const next = cloneGrid(gridRef.current); const value = tool === 'eraser' ? null : color
    const points = new Set(lineBetween(lastCell.current?.[0] ?? x, lastCell.current?.[1] ?? y, x, y).map(([px, py]) => `${px},${py}`))
    for (const point of points) { const [px, py] = point.split(',').map(Number); for (const [tx, ty] of [[px, py], [mirrorX ? size - 1 - px : px, py], [px, mirrorY ? size - 1 - py : py], [mirrorX ? size - 1 - px : px, mirrorY ? size - 1 - py : py]]) if (tx >= 0 && ty >= 0 && tx < size && ty < size) next[ty][tx] = value }
    gridRef.current = next; replaceCurrentGrid(next); lastCell.current = [x, y]
  }
  const cellFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): [number, number] | null => { const rect = event.currentTarget.getBoundingClientRect(); const cell = Math.min(rect.width, rect.height) / size; const left = (rect.width - cell * size) / 2, top = (rect.height - cell * size) / 2; const x = Math.floor((event.clientX - rect.left - left) / cell), y = Math.floor((event.clientY - rect.top - top) / cell); return x >= 0 && y >= 0 && x < size && y < size ? [x, y] : null }
  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => { const point = cellFromEvent(event); if (!point) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setDrawing(true); strokeStart.current = cloneGrid(gridRef.current); lastCell.current = null; if (tool === 'fill') { commit(floodFill(gridRef.current, point[0], point[1], color)); setDrawing(false) } else if (tool === 'eyedropper') { const picked = gridRef.current[point[1]][point[0]]; if (picked) { setColor(picked); setPalette((p) => [picked, ...p.filter((item) => item !== picked)].slice(0, 14)) }; setDrawing(false) } else paint(point[0], point[1]) }
  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => { if (!drawing) return; event.preventDefault(); const point = cellFromEvent(event); if (point) paint(point[0], point[1]) }
  const pointerUp = () => { if (drawing && strokeStart.current) { setHistory((items) => [...items.slice(-39), strokeStart.current!]); setFuture([]) }; setDrawing(false); strokeStart.current = null; lastCell.current = null }
  const undo = () => { const previous = history[history.length - 1]; if (!previous) return; setFuture((items) => [...items, cloneGrid(grid)]); replaceCurrentGrid(previous); setHistory((items) => items.slice(0, -1)) }
  const redo = () => { const next = future[future.length - 1]; if (!next) return; setHistory((items) => [...items, cloneGrid(grid)]); replaceCurrentGrid(next); setFuture((items) => items.slice(0, -1)) }
  useEffect(() => { const key = (event: KeyboardEvent) => { if (!(event.ctrlKey || event.metaKey)) return; if (event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo() } else if (event.key.toLowerCase() === 'y') { event.preventDefault(); redo() } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key) })

  const resize = (newSize: number) => { if (newSize === size) return; const offset = Math.floor((newSize - size) / 2); const resizeGrid = (source: PixelGrid) => { const next = makeGrid(newSize); for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) { const nx = x + offset, ny = y + offset; if (nx >= 0 && ny >= 0 && nx < newSize && ny < newSize) next[ny][nx] = source[y][x] }; return next }; setAnimations((items) => items.map((item) => ({ ...item, frames: item.frames.map(resizeGrid) }))); setSize(newSize); setHistory([]); setFuture([]) }
  const newProject = () => { if (window.confirm('Clear the current animation and start over?')) { setAnimations([{ id: 'animation-1', name: 'Animation 1', frames: [makeGrid(size)], fps: 8, loop: true }]); setCurrentAnimation(0); setCurrentFrame(0); setHistory([]); setFuture([]); setPlaying(false) } }
  const exportCanvas = (flat: boolean) => { const result = flat ? { pixels: grid.flatMap((row, y) => row.map((c, x) => c ? { x, y, color: c } : null).filter(Boolean) as { x: number; y: number; color: string }[]), width: size, height: size } : flatToIso(grid, depth); if (!result.width) return; const out = document.createElement('canvas'); out.width = result.width; out.height = result.height; const ctx = out.getContext('2d')!; ctx.imageSmoothingEnabled = false; for (const pixel of result.pixels) { ctx.fillStyle = pixel.color; ctx.fillRect(pixel.x, pixel.y, 1, 1) }; const link = document.createElement('a'); link.download = flat ? 'flat-pixel-art.png' : 'isometric-pixel-art.png'; link.href = out.toDataURL('image/png'); link.click() }
  const exportSpriteSheet = () => {
    const frameWidth = flatToIso(makeGrid(size), depth, false).width
    const frameHeight = flatToIso(makeGrid(size), depth, false).height
    const frameImages = animations.map((item) => item.frames.map((frame) => flatToIso(frame, depth, false)))
    const columns = Math.max(...animations.map((item) => item.frames.length), 1)
    if (!frameWidth || !frameHeight) return
    const cellWidth = frameWidth * exportScale + exportPadding * 2
    const cellHeight = frameHeight * exportScale + exportPadding * 2
    const out = document.createElement('canvas'); out.width = cellWidth * columns; out.height = cellHeight * animations.length
    const ctx = out.getContext('2d')!; ctx.imageSmoothingEnabled = false
    frameImages.forEach((row, rowIndex) => row.forEach((image, frameIndex) => { for (const pixel of image.pixels) { ctx.fillStyle = pixel.color; ctx.fillRect(frameIndex * cellWidth + exportPadding + pixel.x * exportScale, rowIndex * cellHeight + exportPadding + pixel.y * exportScale, exportScale, exportScale) } }))
    const metadata = { cellWidth, cellHeight, frameWidth, frameHeight, scale: exportScale, padding: exportPadding, columns, rows: animations.length, animations: animations.map((item, row) => ({ name: item.name, row, fps: item.fps, loop: item.loop, frames: item.frames.map((_, frame) => ({ x: frame * cellWidth + exportPadding, y: row * cellHeight + exportPadding, width: frameWidth * exportScale, height: frameHeight * exportScale })) })) }
    const download = (name: string, href: string) => { const link = document.createElement('a'); link.download = name; link.href = href; link.click() }
    download('isometric-animation-spritesheet.png', out.toDataURL('image/png'))
    download('isometric-animation-spritesheet.json', URL.createObjectURL(new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' })))
  }
  const addFrame = (duplicate: boolean) => { const next = duplicate ? cloneGrid(grid) : makeGrid(size); updateAnimation((item) => ({ ...item, frames: [...item.frames.slice(0, currentFrame + 1), next, ...item.frames.slice(currentFrame + 1)] })); setCurrentFrame(currentFrame + 1); setHistory([]); setFuture([]) }
  const deleteFrame = () => { if (frames.length === 1) return; updateAnimation((item) => ({ ...item, frames: item.frames.filter((_, index) => index !== currentFrame) })); setCurrentFrame(Math.min(currentFrame, frames.length - 2)); setHistory([]); setFuture([]) }
  const moveFrame = (direction: -1 | 1) => { const target = currentFrame + direction; if (target < 0 || target >= frames.length) return; updateAnimation((item) => { const next = [...item.frames]; [next[currentFrame], next[target]] = [next[target], next[currentFrame]]; return { ...item, frames: next } }); setCurrentFrame(target) }
  const addAnimation = (duplicate: boolean) => { const next: AnimationTrack = { id: `animation-${Date.now()}`, name: duplicate ? `${animation.name} copy` : `Animation ${animations.length + 1}`, frames: duplicate ? frames.map(cloneGrid) : [makeGrid(size)], fps, loop }; setAnimations((items) => [...items.slice(0, currentAnimation + 1), next, ...items.slice(currentAnimation + 1)]); setCurrentAnimation(currentAnimation + 1); setCurrentFrame(0); setHistory([]); setFuture([]) }
  const deleteAnimation = () => { if (animations.length === 1) return; setAnimations((items) => items.filter((_, index) => index !== currentAnimation)); setCurrentAnimation(Math.min(currentAnimation, animations.length - 2)); setCurrentFrame(0); setHistory([]); setFuture([]) }
  const renameAnimation = () => { const name = window.prompt('Animation name', animation.name)?.trim(); if (name) updateAnimation((item) => ({ ...item, name })) }
  const setAnimationFps = (value: number) => updateAnimation((item) => ({ ...item, fps: value }))
  const setAnimationLoop = (value: boolean) => updateAnimation((item) => ({ ...item, loop: value }))
  useEffect(() => { if (!playing) return; const timer = window.setInterval(() => { setCurrentFrame((frame) => { const next = frame + 1; if (next < frames.length) return next; if (loop) return 0; setPlaying(false); return frame }) }, 1000 / Math.max(1, fps)); return () => window.clearInterval(timer) }, [playing, fps, frames.length, loop])
  const importPng = (file: File) => { const image = new Image(); image.onload = () => { if (image.width > 64 || image.height > 64) { window.alert('PNG must be 64 × 64 or smaller.'); return } const nextSize = SIZES.find((item) => item >= Math.max(image.width, image.height)) ?? 64; const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0); const data = ctx.getImageData(0, 0, image.width, image.height).data; const next = makeGrid(nextSize); const offsetX = Math.floor((nextSize - image.width) / 2), offsetY = Math.floor((nextSize - image.height) / 2); for (let y = 0; y < image.height; y += 1) for (let x = 0; x < image.width; x += 1) { const i = (y * image.width + x) * 4; if (data[i + 3] > 0) next[y + offsetY][x + offsetX] = `#${[data[i], data[i + 1], data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}` }; commit(next); setSize(nextSize) }; image.src = URL.createObjectURL(file) }
  const useColor = (value: string) => { setColor(value); setPalette((items) => [value, ...items.filter((item) => item !== value)].slice(0, 14)) }

  return <main className="app-shell"><header className="topbar"><div className="brand"><span className="brand-mark">◆</span><div><strong>PIXEL <em>→</em> ISO</strong><small>2:1 raster converter</small></div></div><div className="header-actions"><button className="quiet-button" onClick={newProject}>New</button><button className="quiet-button" onClick={exportSpriteSheet}>Export sprites</button><button className="primary-button" onClick={() => exportCanvas(false)}>Export PNG <span>↗</span></button></div></header>
    <section className="workspace"><div className="panel editor-panel"><div className="panel-heading"><div><span className="eyebrow">FRAME {currentFrame + 1} / {frames.length} · SOURCE / {size} × {size}</span><h2>Flat editor</h2></div><button className="icon-button" aria-label="Import PNG" title="Import PNG" onClick={() => fileRef.current?.click()}>↥</button><input ref={fileRef} type="file" accept="image/png" hidden onChange={(e) => e.target.files?.[0] && importPng(e.target.files[0])} /></div><div className="canvas-wrap editor-wrap"><canvas ref={editorRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} /></div><div className="panel-foot"><span>Click or drag to paint</span><span className="shortcut">{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} Z to undo</span></div></div>
      <div className="panel preview-panel"><div className="panel-heading"><div><span className="eyebrow">OUTPUT / LIVE</span><h2>Isometric preview</h2></div><div className="zoom-controls"><button className={zoom === 0 ? 'selected' : ''} onClick={() => setZoom(0)}>Fit</button>{[1, 2, 4, 8].map((value) => <button key={value} className={zoom === value ? 'selected' : ''} onClick={() => setZoom(value)}>{value}×</button>)}</div></div><div className="canvas-wrap preview-wrap"><canvas ref={previewRef} /></div><div className="metadata"><span><b>Source</b> {size} × {size}</span><span><b>Iso bounds</b> {iso.width || 0} × {iso.height || 0}</span><span><b>Zoom</b> {zoom === 0 ? 'Fit' : `${zoom}×`}</span></div></div></section>
    <section className="timeline"><div className="animation-tabs">{animations.map((item, index) => <button key={item.id} className={index === currentAnimation ? 'selected' : ''} onClick={() => { setCurrentAnimation(index); setCurrentFrame(0); setPlaying(false); setHistory([]); setFuture([]) }}>{item.name}</button>)}<button onClick={() => addAnimation(false)}>＋ Animation</button><button onClick={renameAnimation}>Rename</button><button onClick={() => addAnimation(true)}>Duplicate animation</button><button onClick={deleteAnimation} disabled={animations.length === 1}>Delete animation</button></div><div className="timeline-head"><div><span className="eyebrow">{animation.name.toUpperCase()} / {frames.length} FRAME{frames.length === 1 ? '' : 'S'}</span><strong>{playing ? 'Playing' : 'Ready'} · {fps} FPS</strong></div><div className="timeline-actions"><button onClick={() => setCurrentFrame(Math.max(0, currentFrame - 1))} aria-label="Previous frame">◀</button><button className="play-button" onClick={() => setPlaying((value) => !value)}>{playing ? 'Pause' : 'Play'}</button><button onClick={() => setCurrentFrame(Math.min(frames.length - 1, currentFrame + 1))} aria-label="Next frame">▶</button><label className="loop-toggle"><input type="checkbox" checked={loop} onChange={(e) => setAnimationLoop(e.target.checked)} /> Loop</label></div></div><div className="frame-strip">{frames.map((frame, index) => <button key={index} className={`frame-card ${index === currentFrame ? 'selected' : ''}`} onClick={() => { setCurrentFrame(index); setPlaying(false); setHistory([]); setFuture([]) }}><span className="frame-number">{index + 1}</span><span className="frame-thumb">{frame.flat().some(Boolean) ? '◆' : '·'}</span></button>)}<button className="add-frame" onClick={() => addFrame(false)} aria-label="Add blank frame">＋</button></div><div className="frame-tools"><button onClick={() => addFrame(true)}>Duplicate frame</button><button onClick={() => addFrame(false)}>Blank frame</button><button onClick={deleteFrame} disabled={frames.length === 1}>Delete</button><button onClick={() => moveFrame(-1)} disabled={currentFrame === 0}>Move left</button><button onClick={() => moveFrame(1)} disabled={currentFrame === frames.length - 1}>Move right</button></div></section>
    <section className="toolbar"><div className="tool-group"><span className="group-label">Tools</span>{([['pencil', '✎', 'Pencil'], ['eraser', '⌫', 'Eraser'], ['fill', '▧', 'Fill'], ['eyedropper', '⌕', 'Eyedropper']] as [Tool, string, string][]).map(([value, icon, label]) => <button key={value} className={`tool-button ${tool === value ? 'active' : ''}`} onClick={() => setTool(value)}><span>{icon}</span>{label}</button>)}</div><div className="color-group"><span className="group-label">Color</span><label className="color-picker"><span className="swatch" style={{ backgroundColor: color }} /><input type="color" value={color} onChange={(e) => useColor(e.target.value)} /><code>{color.toUpperCase()}</code></label><div className="palette">{palette.map((item) => <button key={item} aria-label={`Select ${item}`} className="palette-color" style={{ backgroundColor: item }} onClick={() => useColor(item)} />)}</div></div><div className="options-group"><label><span>Grid</span><input type="checkbox" checked={gridOn} onChange={(e) => setGridOn(e.target.checked)} /><i /></label><label><span>Mirror X</span><input type="checkbox" checked={mirrorX} onChange={(e) => setMirrorX(e.target.checked)} /><i /></label><label><span>Mirror Y</span><input type="checkbox" checked={mirrorY} onChange={(e) => setMirrorY(e.target.checked)} /><i /></label></div><div className="history-group"><button className="text-button" disabled={!history.length} onClick={undo}>↶ Undo</button><button className="text-button" disabled={!future.length} onClick={redo}>Redo ↷</button></div></section>
    <footer className="footer-bar"><div><span className="status-dot" /> Autosaved locally</div><div className="footer-actions"><label>FPS <input className="fps-input" type="number" min="1" max="30" value={fps} onChange={(e) => setAnimationFps(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} /></label><label className="depth-control">Depth <input aria-label="Extrusion depth" type="range" min="1" max="16" step="1" value={depth} onChange={(e) => setDepth(Number(e.target.value))} /><output>{depth}</output></label><label>Grid size <select value={size} onChange={(e) => resize(Number(e.target.value))}>{SIZES.map((item) => <option key={item} value={item}>{item} × {item}</option>)}</select></label><label>Scale <select value={exportScale} onChange={(e) => setExportScale(Number(e.target.value))}>{[1, 2, 4, 8].map((item) => <option key={item} value={item}>{item}×</option>)}</select></label><label>Padding <input className="fps-input" type="number" min="0" max="32" value={exportPadding} onChange={(e) => setExportPadding(Math.max(0, Math.min(32, Number(e.target.value) || 0)))} /></label><button onClick={() => exportCanvas(true)}>Export flat</button></div></footer></main>
}

export default App
