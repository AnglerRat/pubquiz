/**
 * POST /api/rooms  — game master maakt een nieuwe kamer aan.
 * Body: { name?: string, questionSetId: number }
 * Response: { code, hostToken }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const questionSetId = Number(body?.questionSetId)
  const set = Number.isInteger(questionSetId) ? await getQuestionSet(questionSetId) : null
  if (!set || !set.is_active) {
    throw createError({ statusCode: 422, statusMessage: 'Kies een vragenset' })
  }
  if (await countSetQuestions(set.id) === 0) {
    throw createError({ statusCode: 422, statusMessage: 'Deze vragenset bevat nog geen vragen' })
  }

  const name = String(body?.name ?? '').trim().slice(0, 100) || set.title
  const hostToken = generateToken()

  // Unieke code genereren (botsing is zeldzaam, maar vang hem netjes af).
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRoomCode()
    try {
      await dbExecute(
        'INSERT INTO rooms (code, name, host_token, question_set_id) VALUES (?, ?, ?, ?)',
        [code, name, hostToken, set.id],
      )
      setResponseStatus(event, 201)
      return { code, hostToken }
    }
    catch (error) {
      if (error?.code !== 'ER_DUP_ENTRY') throw error
    }
  }
  throw createError({ statusCode: 500, statusMessage: 'Kon geen unieke kamercode maken' })
})
