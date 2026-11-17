/**
 * POST /api/rooms/:code/reveal — game master toont (of verbergt) het goede antwoord van de huidige vraag.
 * Body: { revealed?: boolean }  (standaard true)
 * Onthullen sluit ook het antwoorden. Weer verbergen opent het niet opnieuw (daarvoor is /reopen).
 */
export default defineEventHandler(async (event) => {
  const room = await requireHost(event)
  if (room.status !== 'playing') {
    throw createError({ statusCode: 409, statusMessage: 'Het spel is niet bezig' })
  }

  const body = await readBody(event).catch(() => ({}))
  const revealed = body?.revealed !== false
  const questionIndex = room.current_question_index

  await openQuestion(room, questionIndex)
  await dbExecute(
    `UPDATE room_questions
        SET revealed = ?,
            locked_at = IF(?, COALESCE(locked_at, UTC_TIMESTAMP(3)), locked_at)
      WHERE room_id = ? AND question_index = ?`,
    [revealed ? 1 : 0, revealed ? 1 : 0, room.id, questionIndex],
  )
  broadcast(room.code, { type: 'question_state_changed', questionIndex })
  return { ok: true, revealed }
})
