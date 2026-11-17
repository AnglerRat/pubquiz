/**
 * Maakt een deelbare afbeelding (PNG, 1080×1350) van de eindscore van een speler, in de spelshow-stijl.
 * Getekend op een canvas: geen extra libraries nodig en werkt ook zonder internet.
 */

import { ordinal } from './answers'

const C = {
  blue: '#1739b8',
  ink: '#0d1a4a',
  yellow: '#ffcf2e',
  coral: '#ff5a4e',
  sky: '#d9e4ff',
  white: '#ffffff',
  slate: '#475569',
}
const FONT = 'Rubik, system-ui, sans-serif'
const font = (weight, size) => `${weight} ${size}px ${FONT}`

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Blok met dikke rand en harde schaduw (zoals .player-card). */
function block(ctx, x, y, w, h, { fill, radius = 28, border = 6, shadow = 14 }) {
  ctx.fillStyle = C.ink
  roundRect(ctx, x + shadow, y + shadow, w, h, radius)
  ctx.fill()
  ctx.fillStyle = fill
  roundRect(ctx, x, y, w, h, radius)
  ctx.fill()
  ctx.lineWidth = border
  ctx.strokeStyle = C.ink
  ctx.stroke()
}

/** Tekst die krimpt tot hij in `maxWidth` past. */
function fitText(ctx, text, x, y, maxWidth, weight, size, min = 28) {
  let s = size
  ctx.font = font(weight, s)
  while (s > min && ctx.measureText(text).width > maxWidth) {
    s -= 2
    ctx.font = font(weight, s)
  }
  let t = text
  while (ctx.measureText(t).width > maxWidth && t.length > 1) t = t.slice(0, -1)
  ctx.fillText(t === text ? t : `${t.trimEnd()}…`, x, y)
}

/**
 * @param {object} data
 * @param {string} data.roomName
 * @param {string} data.playerName
 * @param {number} data.rank
 * @param {boolean} data.shared       gedeelde plek
 * @param {number} data.playerCount
 * @param {number} data.score
 * @param {number} data.maxScore
 * @param {number} data.correctCount
 * @param {number} data.totalQuestions
 * @returns {Promise<Blob>}
 */
export async function renderScoreImage(data) {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Lettertype moet geladen zijn voordat we tekenen.
  try {
    await Promise.all(['500', '700', '800', '900'].map(w => document.fonts.load(font(w, 40))))
  }
  catch {
    // valt terug op systeemlettertype
  }

  // Achtergrond: blauw met zonnestralen en spotlight
  ctx.fillStyle = C.blue
  ctx.fillRect(0, 0, W, H)
  ctx.save()
  ctx.translate(W / 2, -80)
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  const step = (14 * Math.PI) / 180
  for (let a = 0; a < Math.PI * 2; a += step) {
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, 2400, a, a + step / 2)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  const spot = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 700)
  spot.addColorStop(0, 'rgba(255,255,255,0.25)')
  spot.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = spot
  ctx.fillRect(0, 0, W, H)

  // Logo
  ctx.save()
  ctx.translate(W / 2, 150)
  ctx.rotate((-2 * Math.PI) / 180)
  ctx.font = font(900, 76)
  const logo = 'PUBQUIZ'
  const logoW = ctx.measureText(logo).width + 90
  block(ctx, -logoW / 2, -62, logoW, 124, { fill: C.yellow, radius: 22, border: 6, shadow: 10 })
  ctx.fillStyle = C.ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(logo, 0, 4)
  ctx.restore()

  // Kaart
  const cx = 90
  const cy = 290
  const cw = W - 180
  const ch = 930
  block(ctx, cx, cy, cw, ch, { fill: C.white, radius: 36, border: 7, shadow: 18 })

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const mid = W / 2
  const inner = cw - 120

  // Kamernaam als chip
  ctx.font = font(700, 30)
  const chip = (data.roomName || 'Pubquiz').toUpperCase()
  const chipW = Math.min(inner, ctx.measureText(chip).width + 60)
  ctx.fillStyle = C.sky
  roundRect(ctx, mid - chipW / 2, cy + 60, chipW, 56, 28)
  ctx.fill()
  ctx.fillStyle = C.ink
  fitText(ctx, chip, mid, cy + 99, chipW - 40, 700, 30, 20)

  // Naam
  ctx.fillStyle = C.ink
  fitText(ctx, data.playerName, mid, cy + 215, inner, 900, 84, 40)

  // Plek
  ctx.fillStyle = C.slate
  ctx.font = font(500, 36)
  ctx.fillText('eindigde op de', mid, cy + 285)

  const rankR = 150
  const rankY = cy + 460
  ctx.fillStyle = C.ink
  ctx.beginPath()
  ctx.arc(mid + 10, rankY + 10, rankR, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = data.rank === 1 ? C.yellow : data.rank <= 3 ? C.sky : C.white
  ctx.beginPath()
  ctx.arc(mid, rankY, rankR, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = 7
  ctx.strokeStyle = C.ink
  ctx.stroke()
  ctx.fillStyle = C.ink
  ctx.textBaseline = 'middle'
  ctx.font = font(900, data.rank >= 100 ? 120 : 150)
  ctx.fillText(ordinal(data.rank), mid, rankY + 8)
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = C.slate
  ctx.font = font(500, 36)
  ctx.fillText(
    `${data.shared ? 'gedeelde plek ' : 'plek '}van ${data.playerCount} ${data.playerCount === 1 ? 'speler' : 'spelers'}`,
    mid,
    rankY + rankR + 70,
  )

  // Score-vakjes
  const boxY = cy + ch - 230
  const boxW = (inner - 40) / 2
  const boxes = [
    { label: 'PUNTEN', value: String(data.score), sub: data.maxScore ? `van ${data.maxScore}` : '' },
    { label: 'GOED', value: String(data.correctCount), sub: `van ${data.totalQuestions} vragen` },
  ]
  boxes.forEach((b, i) => {
    const x = cx + 60 + i * (boxW + 40)
    block(ctx, x, boxY, boxW, 170, { fill: i === 0 ? C.yellow : C.sky, radius: 22, border: 5, shadow: 8 })
    const bx = x + boxW / 2
    ctx.fillStyle = C.ink
    ctx.font = font(800, 26)
    ctx.fillText(b.label, bx, boxY + 45)
    ctx.font = font(900, 72)
    ctx.fillText(b.value, bx, boxY + 118)
    ctx.font = font(500, 24)
    ctx.fillText(b.sub, bx, boxY + 152)
  })

  // Voettekst
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = font(500, 32)
  ctx.fillText(
    new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    mid,
    H - 60,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Afbeelding maken mislukt'))), 'image/png')
  })
}

/**
 * Deelt de afbeelding via het deelmenu van de telefoon (alleen via https), of downloadt hem.
 * @returns {Promise<'shared' | 'downloaded' | 'cancelled'>}
 */
export async function shareOrDownload(blob, filename) {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Mijn pubquiz-score' })
      return 'shared'
    }
    catch (e) {
      if (e?.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return 'downloaded'
}
