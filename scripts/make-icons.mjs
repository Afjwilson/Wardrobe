// Generates the PWA icons: a coat hanger on the app's ink background.
// Raw PNG encoding keeps this dependency-free.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'

const BG = [0x0b, 0x0b, 0x0e]
const FG = [0xc8, 0xa2, 0x6a]

function crc32(buf) {
  let c = ~0
  for (const byte of buf) {
    c ^= byte
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** Distance from point to segment, for drawing the hanger's strokes. */
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

function coverage(x, y, size) {
  const u = x / size
  const v = y / size
  const stroke = 0.045
  // Triangle bar of the hanger.
  const apex = [0.5, 0.42]
  const left = [0.2, 0.7]
  const right = [0.8, 0.7]
  const bar = Math.min(
    distToSegment(u, v, apex[0], apex[1], left[0], left[1]),
    distToSegment(u, v, apex[0], apex[1], right[0], right[1]),
    distToSegment(u, v, left[0], left[1], right[0], right[1]),
  )
  // Hook: an arc above the apex.
  const cx = 0.5
  const cy = 0.3
  const r = 0.1
  const angle = Math.atan2(v - cy, u - cx)
  const onArc = angle > -Math.PI * 0.95 && angle < Math.PI * 0.55
  const hook = onArc ? Math.abs(Math.hypot(u - cx, v - cy) - r) : Infinity
  const neck = distToSegment(u, v, 0.5, 0.36, 0.5, 0.42)
  const d = Math.min(bar, hook, neck)
  // Antialias across one pixel.
  return Math.max(0, Math.min(1, (stroke - d) * size * 0.5 + 0.5))
}

function png(size) {
  const raw = Buffer.alloc(size * (size * 3 + 1))
  let offset = 0
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0
    for (let x = 0; x < size; x++) {
      const a = coverage(x + 0.5, y + 0.5, size)
      for (let ch = 0; ch < 3; ch++) {
        raw[offset++] = Math.round(BG[ch] * (1 - a) + FG[ch] * a)
      }
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), png(size))
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#0b0b0e"/>
  <g fill="none" stroke="#c8a26a" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M50 42 L20 70 H80 Z"/>
    <path d="M50 40 V36 A10 10 0 1 0 40 26"/>
  </g>
</svg>
`
writeFileSync(new URL('../public/favicon.svg', import.meta.url), svg)
console.log('icons written')
