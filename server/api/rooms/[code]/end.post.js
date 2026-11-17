/** POST /api/rooms/:code/end — game master beëindigt het spel. */
export default defineEventHandler(async (event) => {
  const room = await requireHost(event)
  if (room.status === 'finished') return { ok: true }

  await dbExecute(`UPDATE rooms SET status = 'finished', finished_at = UTC_TIMESTAMP() WHERE id = ?`, [room.id])
  broadcast(room.code, { type: 'game_ended' })
  return { ok: true }
})
