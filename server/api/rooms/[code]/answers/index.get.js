/**
 * GET /api/rooms/:code/answers?questionIndex=2 — live statistieken van een vraag (alleen game master).
 * Zonder questionIndex: de huidige vraag. Zie `QuestionStats` in shared/types.js.
 */
export default defineEventHandler(async (event) => {
  const room = await requireHost(event)
  const query = getQuery(event)
  const index = query.questionIndex != null ? Number(query.questionIndex) : room.current_question_index
  if (!Number.isInteger(index) || index < 0) return null
  return getQuestionStats(room, index)
})
