/**
 * POST /api/rooms/:code/players — een speler joint de kamer.
 * Body: { name: string }
 * Response: { playerId, token, name }
 */
export default defineEventHandler(async (event) => {
  const room = await requireRoom(event)
  if (room.status !== 'lobby') {
    throw createError({ statusCode: 409, statusMessage: 'Het spel is al begonnen, je kunt niet meer meedoen' })
  }

  const body = await readBody(event)
  const name = String(body?.name ?? '').trim().replace(/\s+/g, ' ')

  if (name.length < 2 || name.length > 20) {
    throw createError({ statusCode: 422, statusMessage: 'Kies een naam van 2 tot 20 tekens' })
  }

  const token = generateToken()
  try {
    const result = await dbExecute(
      'INSERT INTO players (room_id, name, token) VALUES (?, ?, ?)',
      [room.id, name, token],
    )
    broadcast(room.code, { type: 'players_changed' })
    setResponseStatus(event, 201)
    return { playerId: result.insertId, token, name }
  }
  catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      throw createError({ statusCode: 409, statusMessage: 'Die naam is al bezet, kies een andere' })
    }
    throw error
  }
})
