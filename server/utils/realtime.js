/**
 * Realtime hub: houdt per kamer bij welke websocket-verbindingen (peers) er zijn
 * en verstuurt signalen naar die kamer. Wordt gebruikt vanuit API-routes én de ws-handler.
 *
 * Let op: dit is in-memory (één serverproces). Bij schalen naar meerdere processen
 * kun je hier bijvoorbeeld Redis pub/sub tussen zetten.
 *
 * Een peer-info ziet er zo uit: { room: 'ABCDE', role: 'host' | 'player', playerId?: number }
 */

/** kamercode → Map(peerId → { peer, info }) */
const peersByRoom = new Map()
/** peerId → kamercode */
const roomOfPeer = new Map()

export function registerPeer(peer, info) {
  unregisterPeer(peer)
  let room = peersByRoom.get(info.room)
  if (!room) {
    room = new Map()
    peersByRoom.set(info.room, room)
  }
  room.set(peer.id, { peer, info })
  roomOfPeer.set(peer.id, info.room)
}

/** Verwijdert een peer en geeft zijn info terug (of undefined als hij niet in een kamer zat). */
export function unregisterPeer(peer) {
  const code = roomOfPeer.get(peer.id)
  if (!code) return undefined
  roomOfPeer.delete(peer.id)
  const room = peersByRoom.get(code)
  const entry = room?.get(peer.id)
  room?.delete(peer.id)
  if (room && room.size === 0) peersByRoom.delete(code)
  return entry?.info
}

/** Heeft deze speler nog een open verbinding (bijv. een tweede tabblad)? */
export function isPlayerOnline(roomCode, playerId) {
  for (const { info } of peersByRoom.get(roomCode)?.values() ?? []) {
    if (info.role === 'player' && info.playerId === playerId) return true
  }
  return false
}

/** Vergeet alle verbindingen van één speler (bijv. nadat de game master hem verwijderd heeft). */
export function forgetPlayerPeers(roomCode, playerId) {
  const room = peersByRoom.get(roomCode)
  if (!room) return
  for (const [id, { info }] of room) {
    if (info.role === 'player' && info.playerId === playerId) {
      room.delete(id)
      roomOfPeer.delete(id)
    }
  }
}

export function sendMessage(peer, message) {
  peer.send(JSON.stringify(message))
}

/**
 * Stuur een signaal naar alle verbonden clients in een kamer.
 * @param {string} roomCode
 * @param {{ type: string, [key: string]: unknown }} event  bijv. { type: 'question_changed', questionIndex: 2 }
 * @param {'all' | 'host' | 'players'} [audience='all']  alleen naar de host of alleen naar spelers sturen
 */
export function broadcast(roomCode, event, audience = 'all') {
  const data = JSON.stringify({ type: 'event', room: roomCode, at: Date.now(), event })
  for (const { peer, info } of peersByRoom.get(roomCode)?.values() ?? []) {
    if (audience === 'host' && info.role !== 'host') continue
    if (audience === 'players' && info.role !== 'player') continue
    try {
      peer.send(data)
    }
    catch (error) {
      console.warn('[realtime] versturen mislukt', peer.id, error)
    }
  }
}
