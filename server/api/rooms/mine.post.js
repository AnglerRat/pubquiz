/**
 * POST /api/rooms/mine — kamers van deze game master (op basis van de host-tokens op dit apparaat).
 * Body: { tokens: string[] }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const tokens = Array.isArray(body?.tokens)
    ? body.tokens.filter(t => typeof t === 'string').slice(0, 100)
    : []
  if (tokens.length === 0) return []

  const rows = await dbQuery(
    `SELECT r.code, r.name, r.status, r.created_at, s.title AS set_title,
            (SELECT COUNT(*) FROM players p WHERE p.room_id = r.id) AS player_count
       FROM rooms r
       LEFT JOIN question_sets s ON s.id = r.question_set_id
      WHERE r.host_token IN (?)
      ORDER BY r.created_at DESC`,
    [tokens],
  )

  return rows.map(r => ({
    code: r.code,
    name: r.name,
    status: r.status,
    questionSetTitle: r.set_title,
    createdAt: toIso(r.created_at),
    playerCount: Number(r.player_count),
  }))
})
