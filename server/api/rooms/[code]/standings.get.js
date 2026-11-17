/**
 * GET /api/rooms/:code/standings — de stand (tussenstand of eindstand), hoogste score eerst.
 * Zie `Standings` in shared/types.js.
 */
export default defineEventHandler(async (event) => {
  const room = await requireRoom(event)
  return getStandings(room)
})
