/** POST /api/rooms/:code/start — game master start het spel; iedereen gaat naar vraag 0. */
export default defineEventHandler(async (event) => {
  const room = await requireHost(event)
  if (room.status !== 'lobby') {
    throw createError({ statusCode: 409, statusMessage: 'Het spel is al gestart' })
  }
  if (await countSetQuestions(room.question_set_id) === 0) {
    throw createError({ statusCode: 409, statusMessage: 'Aan deze kamer hangt geen vragenset met vragen' })
  }

  const questionIndex = 0
  await dbExecute(
    `UPDATE rooms SET status = 'playing', current_question_index = ?, started_at = UTC_TIMESTAMP() WHERE id = ?`,
    [questionIndex, room.id],
  )
  await openQuestion(room, questionIndex) // start de timer van de eerste vraag
  broadcast(room.code, { type: 'game_started', questionIndex })
  return { ok: true, questionIndex }
})
