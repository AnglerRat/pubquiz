/**
 * Alles wat de game master nodig heeft voor één kamer:
 * kamerstaat (uit de database via de API), websocket-signalen en acties.
 *
 * Extra handlers (bijv. `answer_submitted` op het spelscherm) geef je mee via `on`.
 *
 * @param {string} code  kamercode
 * @param {Record<string, (event: object) => void>} [on]  extra handlers per signaaltype
 */
export function useHostRoom(code, on = {}) {
  const token = getHostToken(code)
  /** @type {import('vue').Ref<import('#shared/types').PublicRoom | null>} */
  const room = ref(null)
  const error = ref(token ? null : 'Deze kamer is niet op dit apparaat aangemaakt.')
  const loading = ref(true)

  // $fetch met het host-token in de header
  const api = $fetch.create({ headers: { 'x-host-token': token ?? '' } })

  async function refresh() {
    try {
      room.value = await $fetch(`/api/rooms/${code}`)
    }
    catch (e) {
      error.value = errorStatus(e) === 404 ? 'Deze kamer bestaat niet (meer).' : errorMessage(e)
    }
    finally {
      loading.value = false
    }
  }

  const socket = token
    ? useRoomSocket(code, {
        role: 'host',
        token,
        onConnected: refresh,
        onError: (message) => { error.value = message },
        on: {
          players_changed: () => refresh(),
          ...on,
          game_started: (e) => {
            refresh()
            on.game_started?.(e)
          },
          question_changed: (e) => {
            if (room.value) room.value.currentQuestionIndex = e.questionIndex
            on.question_changed?.(e)
          },
          game_ended: (e) => {
            refresh()
            on.game_ended?.(e)
          },
        },
      })
    : null

  if (!token) loading.value = false

  // --- Acties (database bijwerken via de API; de server stuurt daarna het signaal) ---
  const start = () => api(`/api/rooms/${code}/start`, { method: 'POST' })
  const nextQuestion = () => api(`/api/rooms/${code}/next`, { method: 'POST' })
  const prevQuestion = () => api(`/api/rooms/${code}/prev`, { method: 'POST' })
  const reveal = (revealed = true) => api(`/api/rooms/${code}/reveal`, { method: 'POST', body: { revealed } })
  const reopen = () => api(`/api/rooms/${code}/reopen`, { method: 'POST' })
  const grade = (answerIds, isCorrect) => api(`/api/rooms/${code}/answers/grade`, { method: 'POST', body: { answerIds, isCorrect } })
  const end = () => api(`/api/rooms/${code}/end`, { method: 'POST' })
  const kick = playerId => api(`/api/rooms/${code}/players/${playerId}`, { method: 'DELETE' })
  const remove = async () => {
    await api(`/api/rooms/${code}`, { method: 'DELETE' })
    removeHostToken(code)
  }

  return {
    room,
    error,
    loading,
    hasAccess: !!token,
    socketStatus: socket?.status ?? ref('closed'),
    refresh,
    api,
    start,
    nextQuestion,
    prevQuestion,
    reveal,
    reopen,
    grade,
    end,
    kick,
    remove,
  }
}
