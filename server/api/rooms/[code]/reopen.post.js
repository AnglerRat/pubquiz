/**
 * POST /api/rooms/:code/reopen — game master herstart de timer van de huidige vraag
 * en opent het antwoorden opnieuw (het antwoord wordt weer verborgen). Gegeven antwoorden blijven staan.
 */
export default defineEventHandler(async (event) => {
  const room = await requireHost(event)
  if (room.status !== 'playing') {
    throw createError({ statusCode: 409, statusMessage: 'Het spel is niet bezig' })
  }

  const questionIndex = room.current_question_index
  await reopenQuestion(room, questionIndex)
  broadcast(room.code, { type: 'question_state_changed', questionIndex })
  return { ok: true }
})
