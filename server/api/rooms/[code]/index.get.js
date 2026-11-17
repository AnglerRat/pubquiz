/** GET /api/rooms/:code — publieke staat van de kamer (incl. spelers). */
export default defineEventHandler(async (event) => {
  const room = await requireRoom(event)
  return getPublicRoom(room)
})
