/**
 * Alles wat een speler nodig heeft voor één kamer: sessie, kamerstaat, websocket-signalen.
 * Regelt ook de standaardgevallen: verwijderd door de game master, kamer gesloten, geen sessie.
 *
 * Extra handlers (bijv. `question_changed` op het spelscherm) geef je mee via `on`.
 *
 * @param {string} code  kamercode
 * @param {Record<string, (event: object) => void>} [on]  extra handlers per signaaltype
 */
export function usePlayerRoom(code, on = {}) {
  const session = getPlayerSession(code)
  /** @type {import('vue').Ref<import('#shared/types').PublicRoom | null>} */
  const room = ref(null)
  const loading = ref(true)
  const me = computed(() => room.value?.players.find(p => p.id === session?.playerId) ?? null)

  // Speler-API met token in de header (voor bijv. antwoorden insturen).
  const api = $fetch.create({ headers: { 'x-player-token': session?.token ?? '' } })

  function kickedOut(reason) {
    clearPlayerSession(code)
    if (reason === 'closed') return navigateTo({ path: '/', query: { closed: '1' } })
    return navigateTo({ path: `/join/${code}`, query: { removed: '1' } })
  }

  async function refresh() {
    try {
      room.value = await $fetch(`/api/rooms/${code}`)
      if (!room.value.players.some(p => p.id === session?.playerId)) return kickedOut('removed')
    }
    catch (e) {
      if (errorStatus(e) === 404) return kickedOut('closed')
    }
    finally {
      loading.value = false
    }
  }

  if (!session) {
    navigateTo(`/join/${code}`, { replace: true })
  }

  const socket = session
    ? useRoomSocket(code, {
        role: 'player',
        token: session.token,
        onConnected: refresh,
        onError: (message) => {
          if (message === 'Speler niet gevonden') kickedOut('removed')
          if (message === 'Kamer niet gevonden') kickedOut('closed')
        },
        on: {
          players_changed: () => refresh(),
          ...on,
          player_removed: (e) => {
            if (e.playerId === session.playerId) kickedOut('removed')
            else on.player_removed?.(e)
          },
          room_closed: () => kickedOut('closed'),
          game_started: (e) => {
            if (room.value) {
              room.value.status = 'playing'
              room.value.currentQuestionIndex = e.questionIndex
            }
            on.game_started?.(e)
          },
          question_changed: (e) => {
            if (room.value) room.value.currentQuestionIndex = e.questionIndex
            on.question_changed?.(e)
          },
          game_ended: (e) => {
            if (room.value) room.value.status = 'finished'
            on.game_ended?.(e)
          },
        },
      })
    : null

  async function leave() {
    await api(`/api/rooms/${code}/players/me`, { method: 'DELETE' }).catch(() => {})
    clearPlayerSession(code)
    return navigateTo('/')
  }

  return {
    session,
    room,
    me,
    loading,
    socketStatus: socket?.status ?? ref('closed'),
    refresh,
    api,
    leave,
  }
}
