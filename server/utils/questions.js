/**
 * Alles rond vragensets en vragen.
 *
 * Een kamer verwijst naar een vragenset (rooms.question_set_id). De "huidige vraag" van een kamer
 * is de vraag op plek `rooms.current_question_index` (0-based) in die set, gesorteerd op position.
 */

/** Actieve vragensets met het aantal vragen (voor de keuzelijst bij het aanmaken van een kamer). */
export async function listQuestionSets() {
  const rows = await dbQuery(
    `SELECT s.id, s.title, s.description, COUNT(i.question_id) AS question_count
       FROM question_sets s
       LEFT JOIN question_set_items i ON i.question_set_id = s.id
      WHERE s.is_active = 1
      GROUP BY s.id
      ORDER BY s.title`,
  )
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    questionCount: Number(r.question_count),
  }))
}

export async function getQuestionSet(id) {
  return dbQueryOne('SELECT * FROM question_sets WHERE id = ?', [id])
}

export async function countSetQuestions(setId) {
  if (!setId) return 0
  const row = await dbQueryOne('SELECT COUNT(*) AS n FROM question_set_items WHERE question_set_id = ?', [setId])
  return Number(row?.n ?? 0)
}

/** De vraag op plek `index` (0-based) in een set, of null. */
export async function getQuestionAt(setId, index) {
  if (!setId || index == null || index < 0) return null
  return dbQueryOne(
    `SELECT q.*
       FROM question_set_items i
       JOIN questions q ON q.id = i.question_id
      WHERE i.question_set_id = ?
      ORDER BY i.position, q.id
      LIMIT 1 OFFSET ?`,
    [setId, index],
  )
}

export async function getQuestionMedia(questionId) {
  const rows = await dbQuery(
    'SELECT * FROM question_media WHERE question_id = ? ORDER BY position, id',
    [questionId],
  )
  return rows.map(m => ({
    id: m.id,
    kind: m.kind,
    url: m.url,
    caption: m.caption,
    startSeconds: m.start_seconds,
    endSeconds: m.end_seconds,
  }))
}

/** Antwoordtypes waarbij de speler uit opties kiest. */
export const CHOICE_TYPES = ['single_choice', 'multiple_choice']

/**
 * Antwoordopties van een vraag, op volgorde.
 * @param {number} questionId
 * @param {{ withCorrect?: boolean }} [options]  withCorrect: `isCorrect` meesturen (alleen voor de game master!)
 */
export async function getQuestionOptions(questionId, { withCorrect = false } = {}) {
  const rows = await dbQuery(
    'SELECT * FROM question_options WHERE question_id = ? ORDER BY position, id',
    [questionId],
  )
  return rows.map(o => ({
    id: o.id,
    label: o.label,
    ...(withCorrect ? { isCorrect: !!o.is_correct } : {}),
  }))
}

/**
 * De huidige vraag van een kamer in publieke vorm, incl. de staat (timer, gesloten, onthuld).
 * Het goede antwoord gaat alleen mee voor de game master, of voor iedereen zodra het onthuld is.
 * @param {object} room  database-rij uit `rooms`
 * @param {{ forHost?: boolean, player?: object | null }} [options]
 *   forHost: ook het juiste antwoord en notities meesturen
 *   player:  database-rij van de speler → zijn eigen antwoord meesturen (`myAnswer`)
 * @returns {Promise<object | null>}
 */
export async function getCurrentQuestion(room, { forHost = false, player = null } = {}) {
  const index = room.current_question_index
  const question = await getQuestionAt(room.question_set_id, index)
  if (!question) return null

  const state = toPublicState(await getQuestionState(room, index))
  const showCorrect = forHost || !!state?.revealed

  const result = {
    id: question.id,
    index,
    number: index + 1,
    total: await countSetQuestions(room.question_set_id),
    prompt: question.prompt,
    answerType: question.answer_type,
    points: question.points,
    timeLimitSeconds: question.time_limit_seconds,
    media: await getQuestionMedia(question.id),
    options: CHOICE_TYPES.includes(question.answer_type)
      ? await getQuestionOptions(question.id, { withCorrect: showCorrect })
      : [],
    state,
  }
  if (showCorrect) result.correctAnswer = parseJson(question.correct_answer)
  if (forHost) result.hostNotes = question.host_notes

  if (player) {
    const row = await dbQueryOne(
      'SELECT * FROM answers WHERE room_id = ? AND player_id = ? AND question_index = ?',
      [room.id, player.id, index],
    )
    // Goed/fout pas laten zien als het antwoord onthuld is.
    result.myAnswer = row ? toPublicAnswer(row, { withResult: !!state?.revealed }) : null
  }
  return result
}
