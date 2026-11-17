/**
 * GET /api/rooms/:code/question — de huidige vraag (incl. media en staat: timer, gesloten, onthuld).
 * Met een geldige `x-host-token` header komen ook het juiste antwoord en de notities mee.
 * Met een geldige `x-player-token` header komt het eigen antwoord van de speler mee (`myAnswer`).
 * Response: de vraag, of null als er (nog) geen huidige vraag is.
 */
export default defineEventHandler(async (event) => {
  const room = await requireRoom(event)
  if (room.status === 'lobby') return null
  const forHost = isHostRequest(event, room)
  const player = forHost ? null : await findPlayerFromRequest(event, room)
  return getCurrentQuestion(room, { forHost, player })
})
