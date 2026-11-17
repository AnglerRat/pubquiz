import { randomBytes, randomInt } from 'node:crypto'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // geen 0/O en 1/I verwarring
export const ROOM_CODE_LENGTH = 5

export function generateRoomCode() {
  let code = ''
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return code
}

export function generateToken() {
  return randomBytes(32).toString('hex')
}

export function normalizeCode(code) {
  return String(code ?? '').trim().toUpperCase()
}

/** Kamer-rij uit de database (kolomnamen zoals in de tabel `rooms`), of null. */
export async function findRoomByCode(code) {
  return dbQueryOne('SELECT * FROM rooms WHERE code = ?', [normalizeCode(code)])
}

/** Haalt de kamer op uit de route-param `code`, of gooit een 404. */
export async function requireRoom(event) {
  const room = await findRoomByCode(getRouterParam(event, 'code') ?? '')
  if (!room) throw createError({ statusCode: 404, statusMessage: 'Kamer niet gevonden' })
  return room
}

/** Komt deze request van de game master van deze kamer? (header `x-host-token`) */
export function isHostRequest(event, room) {
  const token = getHeader(event, 'x-host-token')
  return !!token && token === room.host_token
}

/** Controleert of de request van de game master komt (header `x-host-token`). */
export async function requireHost(event) {
  const room = await requireRoom(event)
  if (!isHostRequest(event, room)) {
    throw createError({ statusCode: 403, statusMessage: 'Geen toegang tot deze kamer' })
  }
  return room
}

/** De speler achter de header `x-player-token` (in deze kamer), of null. */
export async function findPlayerFromRequest(event, room) {
  const token = getHeader(event, 'x-player-token')
  return token
    ? dbQueryOne('SELECT * FROM players WHERE token = ? AND room_id = ?', [token, room.id])
    : null
}

/** Controleert of de request van een speler in deze kamer komt (header `x-player-token`). */
export async function requirePlayer(event) {
  const room = await requireRoom(event)
  const player = await findPlayerFromRequest(event, room)
  if (!player) throw createError({ statusCode: 401, statusMessage: 'Je zit (niet meer) in deze kamer' })
  return { room, player }
}

/** Database-rij → publieke speler (zonder token). */
export function toPublicPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    isConnected: !!p.is_connected,
    score: p.score,
    joinedAt: toIso(p.joined_at),
  }
}

/** Database-rij → publieke kamerstaat incl. spelers (zonder host-token). */
export async function getPublicRoom(room) {
  const [players, questionSet, totalQuestions] = await Promise.all([
    dbQuery('SELECT * FROM players WHERE room_id = ? ORDER BY joined_at, id', [room.id]),
    room.question_set_id ? getQuestionSet(room.question_set_id) : null,
    countSetQuestions(room.question_set_id),
  ])
  return {
    code: room.code,
    name: room.name,
    status: room.status,
    questionSet: questionSet ? { id: questionSet.id, title: questionSet.title } : null,
    totalQuestions,
    currentQuestionIndex: room.current_question_index,
    createdAt: toIso(room.created_at),
    startedAt: toIso(room.started_at),
    finishedAt: toIso(room.finished_at),
    players: players.map(toPublicPlayer),
  }
}
