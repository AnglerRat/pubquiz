<script setup>
/**
 * ============================================================================
 *  SPELERSCHERM TIJDENS HET SPEL
 * ============================================================================
 * De speler beantwoordt hier de huidige vraag (met timer), ziet na het onthullen of het goed was,
 * en krijgt aan het eind de eindstand (met optie om een afbeelding op te slaan).
 *
 * Beschikbaar:
 *  - `room`      → kamerstaat; `currentQuestionIndex` en `status` worden live bijgewerkt
 *  - `question`  → de huidige vraag incl. `state` (timer, gesloten, onthuld) en `myAnswer` (zie shared/types.js)
 *  - `me`        → deze speler (naam, score)
 *  - `api`       → $fetch met `x-player-token` header
 * ============================================================================
 */
definePageMeta({ layout: 'player' })

const route = useRoute()
const code = String(route.params.code).toUpperCase()

const { session, room, me, loading, socketStatus, refresh: refreshRoom, api } = usePlayerRoom(code, {
  question_state_changed: () => {
    refreshQuestion()
    refreshRoom() // score kan veranderd zijn
  },
  answers_changed: () => {
    refreshQuestion()
    refreshRoom()
  },
})

const { question, refresh: refreshQuestion } = useCurrentQuestion(code, () => room.value?.currentQuestionIndex, api)
const questionNumber = computed(() => (room.value?.currentQuestionIndex ?? 0) + 1)

const { expired } = useCountdown(() => question.value?.state)
const revealed = computed(() => !!question.value?.state?.revealed)
const closed = computed(() => !!question.value?.state?.locked || expired.value)
const myAnswer = computed(() => question.value?.myAnswer ?? null)

// Nog in de lobby (bijv. direct naar deze URL gegaan)? Terug naar de wachtruimte.
watch(() => room.value?.status, (status) => {
  if (status === 'lobby')
    navigateTo(`/play/${code}`, { replace: true });
});

// Na herverbinden (telefoon uit slaapstand) kunnen we signalen gemist hebben.
watch(socketStatus, (status, previous) => {
  if (status === 'open' && previous && previous !== 'open' && room.value?.status === 'playing')
    refreshQuestion();
});

const sending = ref(false);
const sendError = ref(null);
watch(() => question.value?.id, () => { sendError.value = null });

async function send(answer) {
  if (!question.value) return
  sending.value = true
  sendError.value = null
  const questionIndex = question.value.index
  try {
    const res = await api(`/api/rooms/${code}/answers`, {
      method: 'POST',
      body: { questionIndex, answer },
    });

    if (question.value?.index === questionIndex) {
      question.value.myAnswer = {
        ...(question.value.myAnswer ?? {}),
        answer: res.answer 
      };
    }
  }
  catch (e) {
    sendError.value = errorMessage(e, 'Versturen mislukt, probeer het nog eens')
    if (errorStatus(e) === 409)
      refreshQuestion()
  }
  finally {
    sending.value = false
  }
}

const result = computed(() => {
  if (!revealed.value || !question.value) return null
  if (!myAnswer.value)
    return {
      kind: 'none',
      title: 'Geen antwoord',
      text: 'Je hebt geen antwoord gegeven.'
    }
  
  if (myAnswer.value.isCorrect === true)
    return {
      kind: 'good',
      title: 'Goed antwoord!',
      text: `+${pointsLabel(myAnswer.value.pointsAwarded)}`
    }

  if (myAnswer.value.isCorrect === false)
    return {
      kind: 'bad',
      title: 'Oh oh! Fout.',
      text: undefined
    }

  return {
    kind: 'pending',
    title: 'Wordt nagekeken',
    text: 'De quizmaster beoordeelt je antwoord.'
  }
});

const correctOpenAnswer = computed(() => {
  const value = question.value?.correctAnswer
  return Array.isArray(value) ? value[0] : value
});

const RESULT_CLASS = {
  good: 'border-emerald-600 bg-emerald-50 text-emerald-900',
  bad: 'border-show-coral bg-show-coral/10 text-red-900',
  none: 'border-show-ink bg-slate-100',
  pending: 'border-show-ink bg-show-yellow/30',
};

const RESULT_ICON = {
  good: 'i-lucide-party-popper',
  bad: 'i-lucide-circle-x',
  none: 'i-lucide-clock',
  pending: 'i-lucide-hourglass',
};

const mediaHint = computed(() => {
  const kinds = new Set(question.value?.media.map(m => m.kind) ?? [])
  if (kinds.has('video')) return 'Bekijk de video op het grote scherm.';
  if (kinds.has('image')) return 'Bekijk de afbeelding op het grote scherm.';
  if (kinds.has('audio')) return 'Luister naar het geluid.';
  return null;
})
</script>

<template>
  <PlayerConnectionDot :status="socketStatus" />

  <div v-if="loading || !room" class="player-card text-slate-600">Laden…</div>

  <!-- Einde: eindstand -->
  <PlayerFinalScore
    v-else-if="room.status === 'finished' && session"
    :code="code"
    :room-name="room.name"
    :player-id="session.playerId"
  />

  <template v-else>
    <div class="player-card">
      <!-- Voortgang -->
      <div class="flex items-center justify-between gap-3">
        <span class="rounded-lg bg-show-ink px-3 py-1 text-base font-extrabold tracking-wide text-show-yellow uppercase">
          Vraag {{ questionNumber }} / {{ room.totalQuestions }}
        </span>
        <span class="truncate text-base text-slate-500">
          {{ me?.name }}<template v-if="me"> · <span class="font-bold text-show-ink">{{ me.score }} punten</span></template>
        </span>
      </div>
      <div
        class="mt-3 flex h-3 gap-1"
        role="progressbar"
        :aria-label="`Vraag ${questionNumber} van ${room.totalQuestions}`"
        :aria-valuenow="questionNumber"
        aria-valuemin="1"
        :aria-valuemax="room.totalQuestions"
      >
        <!-- Blokjes per vraag; bij veel vragen een doorlopende balk -->
        <template v-if="room.totalQuestions <= 15">
          <span
            v-for="n in room.totalQuestions"
            :key="n"
            class="flex-1 rounded-sm border-2 border-show-ink transition-colors duration-300"
            :class="n <= questionNumber ? 'bg-show-yellow' : 'bg-white'"
          />
        </template>
        <span v-else class="flex-1 overflow-hidden rounded-sm border-2 border-show-ink bg-white">
          <span
            class="block h-full bg-show-yellow transition-[width] duration-500"
            :style="{ width: `${(questionNumber / room.totalQuestions) * 100}%` }"
          />
        </span>
      </div>

      <template v-if="question">
        <!-- Timer -->
        <QuestionTimer :state="question.state" variant="player" class="mt-5" />

        <!-- Vraag -->
        <h1 :key="question.id" class="player-title mt-5 text-2xl">{{ question.prompt }}</h1>
        <p v-if="mediaHint" class="mt-2 flex items-center gap-2 text-base font-medium text-slate-600">
          <UIcon name="i-lucide-monitor" class="size-5 shrink-0" />
          {{ mediaHint }}
        </p>
        <p class="mt-1 text-base text-slate-500">{{ pointsLabel(question.points) }}</p>
      </template>
    </div>

    <!-- Antwoord -->
    <div v-if="question" :key="question.id" class="player-card">
      <!-- Uitslag na onthullen -->
      <div
        v-if="result"
        role="status"
        class="mb-5 flex items-center gap-3 rounded-xl border-[3px] px-4 py-3"
        :class="RESULT_CLASS[result.kind]"
      >
        <UIcon :name="RESULT_ICON[result.kind]" class="size-9 shrink-0" />
        <div>
          <p class="text-2xl font-black">{{ result.title }}</p>
          <p class="text-base font-medium">{{ result.text }}</p>
        </div>
      </div>

      <PlayerAnswerForm
        :question="question"
        :closed="closed"
        :sending="sending"
        @submit="send"
      />

      <p v-if="sendError" role="alert" class="player-error">{{ sendError }}</p>

      <!-- Goede antwoord bij een open vraag -->
      <p
        v-if="revealed && question.answerType === 'open' && correctOpenAnswer"
        class="mt-4 rounded-xl border-[3px] border-emerald-600 bg-emerald-50 px-4 py-3 text-emerald-900"
      >
        <span class="block text-sm font-bold uppercase">Goede antwoord</span>
        <span class="text-2xl font-black">{{ correctOpenAnswer }}</span>
      </p>

      <!-- Status -->
      <p v-if="!revealed" class="mt-4 flex items-center gap-2 text-base font-medium text-slate-600" role="status">
        <template v-if="closed">
          <UIcon name="i-lucide-lock" class="size-5 shrink-0" />
          {{ myAnswer ? 'Antwoorden is gesloten. Wacht op de uitslag…' : 'De tijd is om. Je hebt niet geantwoord.' }}
        </template>
        <template v-else-if="myAnswer">
          <UIcon name="i-lucide-circle-check" class="size-5 shrink-0 text-emerald-600" />
          Ontvangen! Je kunt je antwoord nog wijzigen.
        </template>
      </p>
    </div>
  </template>
</template>
