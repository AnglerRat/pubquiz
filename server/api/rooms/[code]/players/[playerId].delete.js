/** DELETE /api/rooms/:code/players/:playerId — game master verwijdert een speler. */
export default defineEventHandler(async (event) => {
  const room = await requireHost(event)
  const playerId = Number(getRouterParam(event, 'playerId'))
  if (!Number.isInteger(playerId)) throw createError({ statusCode: 400, statusMessage: 'Ongeldige speler' })

  const result = await dbExecute('DELETE FROM players WHERE id = ? AND room_id = ?', [playerId, room.id])
  if (result.affectedRows === 0) throw createError({ statusCode: 404, statusMessage: 'Speler niet gevonden' })

  // Eerst de speler zelf laten weten dat hij verwijderd is, daarna zijn verbindingen vergeten.
  broadcast(room.code, { type: 'player_removed', playerId })
  forgetPlayerPeers(room.code, playerId)
  broadcast(room.code, { type: 'players_changed' })
  return { ok: true }
})
