/**
 * POST /api/rooms/:code/prev — game master gaat terug naar de vorige vraag.
 * De staat van die vraag (timer, gesloten, onthuld) en de gegeven antwoorden blijven zoals ze waren.
 */
export default defineEventHandler(async (event) => {
  const room = await requireHost(event)
  if (room.status !== 'playing') {
    throw createError({ statusCode: 409, statusMessage: 'Het spel is niet bezig' })
  }

  const questionIndex = (room.current_question_index ?? 0) - 1
  if (questionIndex < 0) {
    throw createError({ statusCode: 409, statusMessage: 'Dit is de eerste vraag' })
  }

  await dbExecute('UPDATE rooms SET current_question_index = ? WHERE id = ?', [questionIndex, room.id])
  await openQuestion(room, questionIndex)
  broadcast(room.code, { type: 'question_changed', questionIndex })
  return { ok: true, questionIndex }
})
