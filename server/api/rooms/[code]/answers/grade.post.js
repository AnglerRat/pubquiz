/**
 * POST /api/rooms/:code/answers/grade — game master keurt antwoorden handmatig goed of fout
 * (bijv. een open antwoord met een tikfout). Scores worden opnieuw berekend.
 * Body: { answerIds: number[], isCorrect: boolean }
 */
export default defineEventHandler(async (event) => {
  const room = await requireHost(event)
  const body = await readBody(event).catch(() => ({}))
  const answerIds = Array.isArray(body?.answerIds)
    ? [...new Set(body.answerIds.map(Number).filter(Number.isInteger))].slice(0, 500)
    : []
  if (answerIds.length === 0 || typeof body?.isCorrect !== 'boolean') {
    throw createError({ statusCode: 422, statusMessage: 'Geef answerIds en isCorrect mee' })
  }

  const rows = await dbQuery(
    'SELECT DISTINCT player_id, question_index FROM answers WHERE room_id = ? AND id IN (?)',
    [room.id, answerIds],
  )
  if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Antwoorden niet gevonden' })

  await dbExecute(
    `UPDATE answers a
       LEFT JOIN questions q ON q.id = a.question_id
        SET a.is_correct = ?,
            a.points_awarded = IF(?, COALESCE(q.points, 0), 0)
      WHERE a.room_id = ? AND a.id IN (?)`,
    [Number(body.isCorrect), Number(body.isCorrect), room.id, answerIds],
  )
  await recalcScores(rows.map(r => r.player_id))

  for (const questionIndex of new Set(rows.map(r => r.question_index))) {
    broadcast(room.code, { type: 'answers_changed', questionIndex })
  }
  return { ok: true }
})
