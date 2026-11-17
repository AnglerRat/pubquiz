<script setup>
/**
 * ============================================================================
 *  GAME MASTER SCHERM TIJDENS HET SPEL
 * ============================================================================
 * De huidige vraag (met timer), live antwoorden, tussenstand en eindstand.
 *
 * Beschikbaar:
 *  - `room`        → kamerstaat incl. `currentQuestionIndex`, `totalQuestions`, `questionSet`, `status`, `players`
 *  - `question`    → de huidige vraag incl. juiste antwoord en `state` (timer, gesloten, onthuld), zie `shared/types.js`
 *  - `stats`       → live antwoorden op de huidige vraag (GET /api/rooms/:code/answers)
 *  - `standings`   → tussenstand / eindstand (GET /api/rooms/:code/standings)
 *  - acties uit useHostRoom: nextQuestion, prevQuestion, reveal, reopen, grade, end
 * ============================================================================
 */
const route = useRoute()
const code = String(route.params.code).toUpperCase()
const toast = useToast()

const {
  room, error, loading, socketStatus, api,
  nextQuestion, prevQuestion, reveal, reopen, grade, end,
} = useHostRoom(code, {
  answer_submitted: () => scheduleStatsRefresh(),
  answers_changed: () => {
    scheduleStatsRefresh()
    if (showStandings.value) loadStandings()
  },
  question_state_changed: () => refreshQuestion(),
  game_ended: () => loadStandings(),
})

// Via `api` gaat het host-token mee, dus krijg je ook het juiste antwoord en de notities.
const { question, loading: questionLoading, refresh: refreshQuestion } = useCurrentQuestion(code, () => room.value?.currentQuestionIndex, api)
const index = computed(() => room.value?.currentQuestionIndex ?? 0)
const isFirstQuestion = computed(() => index.value === 0)
const isLastQuestion = computed(() => !!room.value && index.value + 1 >= room.value.totalQuestions)
const revealed = computed(() => !!question.value?.state?.revealed)
const { expired } = useCountdown(() => question.value?.state)
const canReopen = computed(() => !!question.value?.state && (expired.value || question.value.state.locked))

// --- Live antwoorden ---------------------------------------------------------
const stats = ref(null)
let statsTimer
async function refreshStats() {
  if (room.value?.status !== 'playing') return
  const requested = index.value
  try {
    const result = await api(`/api/rooms/${code}/answers`, { query: { questionIndex: requested } })
    if (requested === index.value) stats.value = result
  }
  catch (e) {
    console.warn('[game] antwoorden ophalen mislukt', errorMessage(e))
  }
}
// Bij veel spelers tegelijk niet voor elk antwoord apart ophalen.
function scheduleStatsRefresh() {
  clearTimeout(statsTimer)
  statsTimer = setTimeout(refreshStats, 250)
}
onBeforeUnmount(() => clearTimeout(statsTimer))

watch(index, () => {
  stats.value = null
  showStandings.value = false
  refreshStats()
})

// --- Stand ---------------------------------------------------------------
const standings = ref(null)
const showStandings = ref(false)
async function loadStandings() {
  try {
    standings.value = await $fetch(`/api/rooms/${code}/standings`)
  }
  catch (e) {
    toast.add({ title: 'Stand ophalen mislukt', description: errorMessage(e), color: 'error' })
  }
}
async function toggleStandings() {
  showStandings.value = !showStandings.value
  if (showStandings.value) await loadStandings()
}

watch(() => room.value?.status, (status) => {
  if (status === 'lobby') navigateTo(`/host/${code}`, { replace: true })
  if (status === 'finished') loadStandings()
  if (status === 'playing') refreshStats()
})

// Na herverbinden kunnen we signalen gemist hebben: alles opnieuw ophalen.
watch(socketStatus, (status, previous) => {
  if (status === 'open' && previous && previous !== 'open' && room.value) {
    refreshQuestion()
    refreshStats()
  }
})

// --- Acties --------------------------------------------------------------
const busy = ref(false)
async function run(action, failTitle) {
  busy.value = true
  try {
    await action()
  }
  catch (e) {
    toast.add({ title: failTitle, description: errorMessage(e), color: 'error' })
  }
  finally {
    busy.value = false
  }
}

const onNext = () => run(nextQuestion, 'Volgende vraag mislukt')
const onPrev = () => run(prevQuestion, 'Vorige vraag mislukt')
const onEnd = () => {
  if (!isLastQuestion.value && !confirm('Het spel nu beëindigen? Niet alle vragen zijn geweest.')) return
  run(end, 'Beëindigen mislukt')
}
const onReveal = () => run(() => reveal(!revealed.value), 'Antwoord tonen mislukt')
const onReopen = () => run(reopen, 'Timer herstarten mislukt')
async function onGrade(answerIds, isCorrect) {
  try {
    await grade(answerIds, isCorrect)
  }
  catch (e) {
    toast.add({ title: 'Beoordelen mislukt', description: errorMessage(e), color: 'error' })
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen()
  else document.documentElement.requestFullscreen()
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-6">
    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :title="error">
      <template #actions>
        <UButton to="/host" color="neutral" variant="outline" label="Naar mijn kamers" />
      </template>
    </UAlert>

    <USkeleton v-else-if="loading || !room" class="h-96" />

    <template v-else>
      <!-- Bediening -->
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold">{{ room.name }}</h1>
          <p class="text-muted">
            Kamer {{ room.code }} · {{ room.players.length }} spelers ·
            <template v-if="room.status === 'finished'">Afgelopen</template>
            <template v-else>Vraag {{ index + 1 }} / {{ room.totalQuestions }}</template>
            <template v-if="room.questionSet"> · {{ room.questionSet.title }}</template>
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <ConnectionBadge :status="socketStatus" />
          <UButton variant="ghost" color="neutral" icon="i-lucide-maximize" aria-label="Volledig scherm" @click="toggleFullscreen" />
          <template v-if="room.status === 'playing'">
            <UPopover v-if="question?.hostNotes">
              <UButton color="neutral" variant="ghost" icon="i-lucide-notebook-pen" label="Notities" />
              <template #content>
                <p class="max-w-sm p-3 text-sm whitespace-pre-line">{{ question.hostNotes }}</p>
              </template>
            </UPopover>
            <UButton
              color="neutral"
              :variant="showStandings ? 'solid' : 'ghost'"
              icon="i-lucide-list-ordered"
              label="Tussenstand"
              @click="toggleStandings"
            />
            <UButton
              v-if="question"
              color="neutral"
              :variant="revealed ? 'solid' : 'outline'"
              :icon="revealed ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              :label="revealed ? 'Verberg antwoord' : 'Toon antwoord'"
              :disabled="busy"
              @click="onReveal"
            />
            <UButton
              :color="isLastQuestion ? 'primary' : 'neutral'"
              :variant="isLastQuestion ? 'solid' : 'outline'"
              :size="isLastQuestion ? 'lg' : 'md'"
              icon="i-lucide-flag"
              label="Beëindig spel"
              :disabled="busy"
              @click="onEnd"
            />
            <UFieldGroup size="lg">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-arrow-left"
                aria-label="Vorige vraag"
                :disabled="busy || isFirstQuestion"
                @click="onPrev"
              />
              <UButton
                v-if="!isLastQuestion"
                trailing-icon="i-lucide-arrow-right"
                label="Volgende vraag"
                :loading="busy"
                @click="onNext"
              />
            </UFieldGroup>
          </template>
          <UButton v-else to="/host" variant="soft" label="Naar mijn kamers" />
        </div>
      </div>

      <!-- Quiz afgelopen: eindstand -->
      <UCard v-if="room.status === 'finished'">
        <div class="flex flex-col items-center gap-2 py-4 text-center">
          <UIcon name="i-lucide-trophy" class="size-12 text-primary" />
          <p class="text-3xl font-bold">Eindstand</p>
        </div>
        <GameStandings v-if="standings" :standings="standings" final />
        <USkeleton v-else class="h-64" />
      </UCard>

      <!-- Tussenstand -->
      <UCard v-else-if="showStandings">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">Tussenstand na vraag {{ index + 1 }}</h2>
            <UButton color="neutral" variant="ghost" icon="i-lucide-x" label="Terug naar de vraag" @click="showStandings = false" />
          </div>
        </template>
        <GameStandings v-if="standings" :standings="standings" />
        <USkeleton v-else class="h-64" />
      </UCard>

      <template v-else>
        <!-- De huidige vraag -->
        <UCard>
          <USkeleton v-if="!question && questionLoading" class="h-80" />
          <template v-else-if="question">
            <div v-if="question.timeLimitSeconds" class="mb-5 flex items-center gap-2">
              <QuestionTimer :state="question.state" class="flex-1" />
              <UButton
                v-if="canReopen"
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-rotate-ccw"
                label="Opnieuw starten"
                :disabled="busy"
                @click="onReopen"
              />
            </div>
            <Transition
              mode="out-in"
              enter-from-class="opacity-0 translate-x-6"
              enter-active-class="transition duration-300"
              leave-to-class="opacity-0 -translate-x-6"
              leave-active-class="transition duration-200"
            >
              <QuestionView :key="question.id" :question="question" :reveal="revealed" show-warnings />
            </Transition>
          </template>
          <p v-else class="py-16 text-center text-muted">Geen vraag gevonden op deze plek in de vragenset.</p>
        </UCard>

        <!-- Live antwoorden -->
        <UCard v-if="question" class="mt-6">
          <GameAnswerStats
            :question="question"
            :stats="stats"
            :players="room.players"
            @grade="onGrade"
          />
        </UCard>
      </template>
    </template>
  </div>
</template>
