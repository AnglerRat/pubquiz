/**
 * Websocket endpoint: ws(s)://<host>/_ws
 *
 * Een client stuurt na het verbinden een `join`-bericht met kamercode, rol en token.
 * Daarna ontvangt hij alle signalen (`type: 'event'`) van die kamer.
 * De websocket draagt alleen signalen; de data zelf staat in (en komt uit) de database.
 */
export default defineWebSocketHandler({
  async message(peer, message) {
    let data
    try {
      data = JSON.parse(message.text())
    }
    catch {
      return sendMessage(peer, { type: 'error', message: 'Ongeldig bericht' })
    }

    if (data.type === 'ping') return sendMessage(peer, { type: 'pong' })

    if (data.type === 'join') {
      const room = await findRoomByCode(data.room)
      if (!room) return sendMessage(peer, { type: 'error', message: 'Kamer niet gevonden' })

      if (data.role === 'host') {
        if (data.token !== room.host_token) return sendMessage(peer, { type: 'error', message: 'Geen toegang' })
        registerPeer(peer, { room: room.code, role: 'host' })
      }
      else {
        const player = await dbQueryOne(
          'SELECT * FROM players WHERE token = ? AND room_id = ?',
          [data.token, room.id],
        )
        if (!player) return sendMessage(peer, { type: 'error', message: 'Speler niet gevonden' })

        registerPeer(peer, { room: room.code, role: 'player', playerId: player.id })
        await dbExecute('UPDATE players SET is_connected = 1, last_seen_at = UTC_TIMESTAMP() WHERE id = ?', [player.id])
        broadcast(room.code, { type: 'players_changed' })
      }

      return sendMessage(peer, { type: 'welcome', role: data.role, room: room.code })
    }
  },

  async close(peer) {
    const info = unregisterPeer(peer)
    if (info?.role === 'player' && info.playerId && !isPlayerOnline(info.room, info.playerId)) {
      await dbExecute('UPDATE players SET is_connected = 0, last_seen_at = UTC_TIMESTAMP() WHERE id = ?', [info.playerId])
      broadcast(info.room, { type: 'players_changed' })
    }
  },

  error(peer, error) {
    console.warn('[ws] fout', peer.id, error)
  },
})
