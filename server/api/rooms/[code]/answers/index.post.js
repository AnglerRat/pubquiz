/**
 * POST /api/rooms/:code/answers — speler stuurt een antwoord in op de huidige vraag (header `x-player-token`).
 * Body: { questionIndex: number, answer: { text } | { optionId } | { optionIds: number[] } }
 *
 * Een speler kan zijn antwoord aanpassen zolang de vraag open is (tijd niet om, niet onthuld).
 * Het antwoord wordt meteen nagekeken; de score van de speler wordt bijgewerkt.
 * Response: { ok, answer }  (goed/fout gaat pas mee bij het onthullen, via GET /question)
 */
export default defineEventHandler(async (event) => {
  const { room, player } = await requirePlayer(event)
  if (room.status !== 'playing') {
    throw createError({ statusCode: 409, statusMessage: 'Het spel is niet bezig' })
  }

  const body = await readBody(event).catch(() => ({}))
  const questionIndex = Number(body?.questionIndex)
  if (questionIndex !== room.current_question_index) {
    throw createError({ statusCode: 409, statusMessage: 'Deze vraag is al voorbij' })
  }

  const question = await getQuestionAt(room.question_set_id, questionIndex)
  if (!question) throw createError({ statusCode: 404, statusMessage: 'Vraag niet gevonden' })

  const state = await getQuestionState(room, questionIndex)
  if (!acceptsAnswers(state)) {
    throw createError({
      statusCode: 409,
      statusMessage: state?.locked_at ? 'Antwoorden is gesloten' : 'De tijd is om',
    })
  }

  const options = CHOICE_TYPES.includes(question.answer_type)
    ? await getQuestionOptions(question.id, { withCorrect: true })
    : []
  const answer = parseAnswerInput(question, body?.answer, options)
  const isCorrect = gradeAnswer(question, answer, options)
  const points = isCorrect ? question.points : 0

  await dbExecute(
    `INSERT INTO answers (room_id, player_id, question_index, question_id, answer, is_correct, points_awarded, answered_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       question_id = VALUES(question_id),
       answer = VALUES(answer),
       is_correct = VALUES(is_correct),
       points_awarded = VALUES(points_awarded),
       answered_at = VALUES(answered_at)`,
    [room.id, player.id, questionIndex, question.id, JSON.stringify(answer), isCorrect == null ? null : Number(isCorrect), points],
  )
  await recalcScores([player.id])

  broadcast(room.code, { type: 'answer_submitted', playerId: player.id, questionIndex }, 'host')
  return { ok: true, answer }
})
