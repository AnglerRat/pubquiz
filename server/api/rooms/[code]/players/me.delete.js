/** DELETE /api/rooms/:code/players/me — speler verlaat zelf de kamer. */
export default defineEventHandler(async (event) => {
  const { room, player } = await requirePlayer(event)
  await dbExecute('DELETE FROM players WHERE id = ?', [player.id])
  forgetPlayerPeers(room.code, player.id)
  broadcast(room.code, { type: 'players_changed' })
  return { ok: true }
})
