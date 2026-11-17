/**
 * Spelverloop per vraag: timer, antwoorden sluiten, onthullen, nakijken en de stand.
 *
 * De staat van een vraag in een kamer staat in `room_questions` (zie migratie 005). Die rij wordt
 * aangemaakt zodra de vraag voor het eerst getoond wordt; terug naar een eerdere vraag houdt de staat.
 * Alle tijden komen uit de database (UTC_TIMESTAMP), zodat server en database nooit uit de pas lopen.
 */

/** Speling na de deadline voor antwoorden die onderweg waren (netwerkvertraging). */
export const ANSWER_GRACE_MS = 2000

/** JSON-kolom → waarde (mysql2 parset JSON al, MariaDB geeft een string terug). */
export function parseJson(value) {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  }
  catch {
    return value
  }
}

/** Goede antwoorden van een open vraag als array met strings. */
export function openCorrectAnswers(question) {
  const value = parseJson(question.correct_answer)
  if (value == null) return []
  return (Array.isArray(value) ? value : [value]).map(String)
}

// --- Staat per vraag -------------------------------------------------------

/** Maakt de staat van een vraag aan (start de timer), als die nog niet bestaat. */
export async function openQuestion(room, index) {
  const question = await getQuestionAt(room.question_set_id, index)
  if (!question) return
  const limit = question.time_limit_seconds || null
  await dbExecute(
    `INSERT IGNORE INTO room_questions (room_id, question_index, question_id, opened_at, closes_at)
     VALUES (?, ?, ?, UTC_TIMESTAMP(3), IF(? IS NULL, NULL, UTC_TIMESTAMP(3) + INTERVAL ? SECOND))`,
    [room.id, index, question.id, limit, limit ?? 0],
  )
}

/** Herstart de timer van een vraag en opent de antwoorden opnieuw. */
export async function reopenQuestion(room, index) {
  await openQuestion(room, index)
  const question = await getQuestionAt(room.question_set_id, index)
  const limit = question?.time_limit_seconds || null
  await dbExecute(
    `UPDATE room_questions
        SET opened_at = UTC_TIMESTAMP(3),
            closes_at = IF(? IS NULL, NULL, UTC_TIMESTAMP(3) + INTERVAL ? SECOND),
            locked_at = NULL,
            revealed = 0
      WHERE room_id = ? AND question_index = ?`,
    [limit, limit ?? 0, room.id, index],
  )
}

/** Database-rij uit `room_questions` (+ `db_now`), of null. Maakt de rij aan voor de huidige vraag als die ontbreekt. */
export async function getQuestionState(room, index = room.current_question_index) {
  if (index == null) return null
  const select = () => dbQueryOne(
    'SELECT rq.*, UTC_TIMESTAMP(3) AS db_now FROM room_questions rq WHERE rq.room_id = ? AND rq.question_index = ?',
    [room.id, index],
  )
  let row = await select()
  if (!row && room.status === 'playing' && index === room.current_question_index) {
    await openQuestion(room, index)
    row = await select()
  }
  return row
}

/** Staat-rij → publieke vorm (zie `QuestionState` in shared/types.js). */
export function toPublicState(row) {
  if (!row) return null
  const closesAt = toIso(row.closes_at)
  const timeUp = !!closesAt && Date.parse(toIso(row.db_now)) >= Date.parse(closesAt)
  return {
    openedAt: toIso(row.opened_at),
    closesAt,
    serverNow: toIso(row.db_now),
    timeUp,
    locked: !!row.locked_at || timeUp,
    revealed: !!row.revealed,
  }
}

/** Mag er (nog) geantwoord worden? */
export function acceptsAnswers(row) {
  if (!row || row.locked_at) return false
  if (!row.closes_at) return true
  return Date.parse(toIso(row.db_now)) <= Date.parse(toIso(row.closes_at)) + ANSWER_GRACE_MS
}

// --- Antwoorden ------------------------------------------------------------

/** Tekst vergelijkbaar maken: hoofdletters, accenten, leestekens en dubbele spaties negeren. */
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/**
 * Controleert de invoer van een speler en zet hem om naar de vorm die we opslaan:
 * open → { text }, keuzevragen → { optionIds: [...] } (gesorteerd).
 */
export function parseAnswerInput(question, input, options) {
  const fail = message => createError({ statusCode: 422, statusMessage: message })

  if (question.answer_type === 'open') {
    const text = String(input?.text ?? '').trim().replace(/\s+/g, ' ').slice(0, 200)
    if (!text) throw fail('Vul een antwoord in')
    return { text }
  }

  const raw = Array.isArray(input?.optionIds) ? input.optionIds : [input?.optionId]
  const valid = new Set(options.map(o => o.id))
  const optionIds = [...new Set(raw.map(Number))].filter(id => valid.has(id)).sort((a, b) => a - b)
  if (optionIds.length === 0) throw fail('Kies een antwoord')
  if (question.answer_type === 'single_choice' && optionIds.length !== 1) throw fail('Kies precies één antwoord')
  return { optionIds }
}

/**
 * Kijkt een antwoord na. Geeft true/false, of null als het niet automatisch kan
 * (geen goed antwoord ingevoerd) — de game master kan het dan zelf goed- of afkeuren.
 */
export function gradeAnswer(question, answer, options) {
  if (question.answer_type === 'open') {
    const correct = openCorrectAnswers(question).map(normalizeText)
    if (correct.length === 0) return null
    return correct.includes(normalizeText(answer.text))
  }
  const correct = options.filter(o => o.isCorrect).map(o => o.id).sort((a, b) => a - b)
  if (correct.length === 0) return null
  return correct.length === answer.optionIds.length && correct.every((id, i) => id === answer.optionIds[i])
}

/** Score van spelers opnieuw berekenen uit hun antwoorden. */
export async function recalcScores(playerIds) {
  if (!playerIds.length) return
  await dbExecute(
    `UPDATE players p
        SET p.score = (SELECT COALESCE(SUM(a.points_awarded), 0) FROM answers a WHERE a.player_id = p.id)
      WHERE p.id IN (?)`,
    [playerIds],
  )
}

/** Database-rij uit `answers` → publieke vorm. */
export function toPublicAnswer(row, { withResult = true } = {}) {
  return {
    id: row.id,
    playerId: row.player_id,
    ...(row.player_name != null ? { playerName: row.player_name } : {}),
    answer: parseJson(row.answer),
    answeredAt: toIso(row.answered_at),
    ...(withResult
      ? { isCorrect: row.is_correct == null ? null : !!row.is_correct, pointsAwarded: row.points_awarded }
      : {}),
  }
}

/** Live statistieken van één vraag (voor de game master). */
export async function getQuestionStats(room, index) {
  const question = await getQuestionAt(room.question_set_id, index)
  if (!question) return null

  const [rows, playerRow] = await Promise.all([
    dbQuery(
      `SELECT a.*, p.name AS player_name
         FROM answers a
         JOIN players p ON p.id = a.player_id
        WHERE a.room_id = ? AND a.question_index = ?
        ORDER BY a.answered_at, a.id`,
      [room.id, index],
    ),
    dbQueryOne('SELECT COUNT(*) AS n FROM players WHERE room_id = ?', [room.id]),
  ])
  const answers = rows.map(r => toPublicAnswer(r))

  const stats = {
    questionIndex: index,
    questionId: question.id,
    answerType: question.answer_type,
    playerCount: Number(playerRow?.n ?? 0),
    answeredCount: answers.length,
    correctCount: answers.filter(a => a.isCorrect === true).length,
    answers,
    optionCounts: {},
    groups: [],
  }

  if (CHOICE_TYPES.includes(question.answer_type)) {
    for (const option of await getQuestionOptions(question.id)) stats.optionCounts[option.id] = 0
    for (const a of answers) {
      for (const id of a.answer?.optionIds ?? []) {
        if (id in stats.optionCounts) stats.optionCounts[id]++
      }
    }
  }
  else {
    // Open antwoorden groeperen op genormaliseerde tekst ("Canberra" en "canberra " zijn één groep).
    const groups = new Map()
    for (const a of answers) {
      const key = normalizeText(a.answer?.text)
      if (!groups.has(key)) groups.set(key, { text: a.answer?.text ?? '', count: 0, answerIds: [], playerNames: [], results: [] })
      const g = groups.get(key)
      g.count++
      g.answerIds.push(a.id)
      g.playerNames.push(a.playerName)
      g.results.push(a.isCorrect)
    }
    stats.groups = [...groups.values()]
      .map(({ results, ...g }) => ({
        ...g,
        isCorrect: results.every(r => r === true) ? true : results.every(r => r === false) ? false : null,
      }))
      .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
  }

  return stats
}

/** Stand van de kamer, hoogste score eerst. Gelijke score = gedeelde plek (1, 1, 3, ...). */
export async function getStandings(room) {
  const [rows, maxRow, totalQuestions] = await Promise.all([
    dbQuery(
      `SELECT p.id, p.name, p.score,
              COUNT(a.id) AS answered,
              COALESCE(SUM(a.is_correct = 1), 0) AS correct
         FROM players p
         LEFT JOIN answers a ON a.player_id = p.id
        WHERE p.room_id = ?
        GROUP BY p.id
        ORDER BY p.score DESC, correct DESC, p.name`,
      [room.id],
    ),
    dbQueryOne(
      `SELECT COALESCE(SUM(q.points), 0) AS n
         FROM question_set_items i
         JOIN questions q ON q.id = i.question_id
        WHERE i.question_set_id = ?`,
      [room.question_set_id],
    ),
    countSetQuestions(room.question_set_id),
  ])

  let rank = 0
  let previousScore
  const players = rows.map((r, i) => {
    if (r.score !== previousScore) rank = i + 1
    previousScore = r.score
    return {
      rank,
      id: r.id,
      name: r.name,
      score: r.score,
      correctCount: Number(r.correct),
      answeredCount: Number(r.answered),
    }
  })

  return {
    status: room.status,
    totalQuestions,
    maxScore: Number(maxRow?.n ?? 0),
    players,
  }
}
