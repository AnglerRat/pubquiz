/**
 * Haalt de huidige vraag (incl. media en staat) op uit de database en ververst zodra de vraagindex verandert.
 * Roep `refresh()` aan bij signalen die de staat veranderen (bijv. `question_state_changed`).
 *
 * @param {string} code  kamercode
 * @param {() => number | null | undefined} index  getter voor de huidige vraagindex, bijv. () => room.value?.currentQuestionIndex
 * @param {(url: string) => Promise<any>} [fetcher]  bijv. de `api` uit useHostRoom (stuurt het host-token mee → incl. juiste antwoord)
 *                                                   of uit usePlayerRoom (speler-token → incl. eigen antwoord)
 * @returns {{ question: import('vue').Ref<import('#shared/types').PublicQuestion | null>, loading: import('vue').Ref<boolean>, refresh: () => Promise<void> }}
 */
export function useCurrentQuestion(code, index, fetcher = $fetch) {
  const question = ref(null)
  const loading = ref(false)
  let requestId = 0

  async function refresh() {
    const id = ++requestId
    loading.value = true
    try {
      const result = await fetcher(`/api/rooms/${code}/question`)
      // Snel achter elkaar wisselen: alleen het laatste antwoord telt.
      if (id === requestId) question.value = result
    }
    catch (e) {
      console.warn('[vraag] ophalen mislukt', errorMessage(e))
    }
    finally {
      if (id === requestId) loading.value = false
    }
  }

  watch(index, (value) => {
    if (value == null) {
      requestId++
      question.value = null
    }
    else refresh()
  }, { immediate: true })

  return { question, loading, refresh }
}
