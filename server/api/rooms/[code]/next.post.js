/**
 * POST /api/rooms/:code/next — game master gaat naar de volgende vraag.
 * Voorbeeld van de flow: eerst de database bijwerken, daarna een signaal naar de kamer sturen.
 */
export default defineEventHandler(async (event) => {
  const room = await requireHost(event)
  if (room.status !== 'playing') {
    throw createError({ statusCode: 409, statusMessage: 'Het spel is niet bezig' })
  }

  const questionIndex = (room.current_question_index ?? -1) + 1
  if (questionIndex >= await countSetQuestions(room.question_set_id)) {
    throw createError({ statusCode: 409, statusMessage: 'Dit was de laatste vraag' })
  }

  await dbExecute('UPDATE rooms SET current_question_index = ? WHERE id = ?', [questionIndex, room.id])
  await openQuestion(room, questionIndex) // start de timer (alleen de eerste keer dat de vraag getoond wordt)
  broadcast(room.code, { type: 'question_changed', questionIndex })
  return { ok: true, questionIndex }
})
