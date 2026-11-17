/**
 * Verbindt met de websocket van een kamer, met automatische reconnect en keep-alive.
 * Sluit automatisch bij het verlaten van de pagina/component.
 *
 * @param {string} code  kamercode
 * @param {object} options
 * @param {'host' | 'player'} options.role
 * @param {string} options.token
 * @param {Record<string, (event: object) => void>} options.on  handlers per signaaltype, bijv. { question_changed: (e) => ... }
 * @param {() => void} [options.onConnected]  na elke (her)verbinding; haal hier de actuele staat op uit de database,
 *                                            want signalen tijdens een verbroken verbinding mis je anders
 * @param {(message: string) => void} [options.onError]
 * @returns {{ status: import('vue').Ref<'connecting' | 'open' | 'closed'>, stop: () => void, reconnect: () => void }}
 */
export function useRoomSocket(code, options) {
  const status = ref('connecting')
  let ws = null
  let retries = 0
  let reconnectTimer
  let pingTimer
  let stopped = false

  const send = (message) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message))
  }

  function connect() {
    if (stopped) return
    clearTimeout(reconnectTimer)
    status.value = 'connecting'

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(`${protocol}//${location.host}/_ws`)
    ws = socket

    socket.onopen = () => {
      send({ type: 'join', room: code, role: options.role, token: options.token })
    }

    socket.onmessage = (msg) => {
      let data
      try {
        data = JSON.parse(msg.data)
      }
      catch {
        return
      }
      switch (data.type) {
        case 'welcome':
          status.value = 'open'
          retries = 0
          options.onConnected?.()
          break
        case 'event':
          options.on[data.event.type]?.(data.event)
          break
        case 'error':
          options.onError?.(data.message)
          break
      }
    }

    socket.onclose = () => {
      if (ws !== socket) return
      ws = null
      status.value = 'closed'
      if (stopped) return
      const delay = Math.min(1000 * 2 ** retries, 10_000)
      retries++
      reconnectTimer = setTimeout(connect, delay)
    }

    socket.onerror = () => socket.close()
  }

  // Telefoons die uit slaapstand komen: meteen opnieuw verbinden.
  function onVisibility() {
    if (document.visibilityState === 'visible' && (!ws || ws.readyState > WebSocket.OPEN)) {
      retries = 0
      connect()
    }
  }

  function stop() {
    stopped = true
    clearTimeout(reconnectTimer)
    clearInterval(pingTimer)
    document.removeEventListener('visibilitychange', onVisibility)
    ws?.close()
    ws = null
  }

  onMounted(() => {
    connect()
    pingTimer = setInterval(() => send({ type: 'ping' }), 25_000)
    document.addEventListener('visibilitychange', onVisibility)
  })
  onBeforeUnmount(stop)

  return { status, stop, reconnect: connect }
}
