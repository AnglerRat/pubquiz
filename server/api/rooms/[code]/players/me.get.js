/** GET /api/rooms/:code/players/me — de huidige speler (header `x-player-token`). */
export default defineEventHandler(async (event) => {
  const { player } = await requirePlayer(event)
  return toPublicPlayer(player)
})
