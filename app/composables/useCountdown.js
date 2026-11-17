/**
 * Aftellen naar de deadline van een vraag. De tijd komt van de server (`state.serverNow`), zodat een
 * telefoon met een verkeerd ingestelde klok toch dezelfde timer laat zien als het grote scherm.
 *
 * @param {() => import('#shared/types').QuestionState | null | undefined} state  bijv. () => question.value?.state
 */
export function useCountdown(state) {
  const now = ref(Date.now())
  const offset = ref(0) // servertijd − lokale tijd
  let timer

  watch(state, (s) => {
    if (s?.serverNow) offset.value = Date.parse(s.serverNow) - Date.now()
  }, { immediate: true })

  const deadline = computed(() => (state()?.closesAt ? Date.parse(state().closesAt) : null))
  const startedAt = computed(() => (state()?.openedAt ? Date.parse(state().openedAt) : null))

  const hasTimer = computed(() => deadline.value != null)
  const remainingMs = computed(() => (hasTimer.value ? Math.max(0, deadline.value - (now.value + offset.value)) : null))
  const seconds = computed(() => (hasTimer.value ? Math.ceil(remainingMs.value / 1000) : null))
  /** 1 = net begonnen, 0 = tijd is om */
  const fraction = computed(() => {
    if (!hasTimer.value) return null
    const total = deadline.value - (startedAt.value ?? deadline.value)
    return total > 0 ? remainingMs.value / total : 0
  })
  const expired = computed(() => hasTimer.value && remainingMs.value === 0)

  onMounted(() => {
    timer = setInterval(() => { now.value = Date.now() }, 200)
  })
  onBeforeUnmount(() => clearInterval(timer))

  return { hasTimer, remainingMs, seconds, fraction, expired }
}
