/** DELETE /api/rooms/:code — game master verwijdert de kamer (spelers en antwoorden gaan mee via CASCADE). */
export default defineEventHandler(async (event) => {
  const room = await requireHost(event)
  await dbExecute('DELETE FROM rooms WHERE id = ?', [room.id])
  broadcast(room.code, { type: 'room_closed' })
  return { ok: true }
})
