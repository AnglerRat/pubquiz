<script setup>
/**
 * Toont één vraag: kop (nummer, type, punten, tijd), vraagtekst, media en antwoordopties.
 * Bedoeld voor het grote scherm van de game master, maar werkt met elke `PublicQuestion`.
 *
 * <QuestionView :question="question" :reveal="showAnswer" show-warnings />
 */
const props = defineProps({
  /** @type {import('vue').PropType<import('#shared/types').PublicQuestion>} */
  question: { type: Object, required: true },
  /** Goede antwoord(en) markeren. Werkt alleen als de vraag met host-token is opgehaald. */
  reveal: { type: Boolean, default: false },
  /** Waarschuwen bij onvolledig ingevoerde vragen (alleen zinvol voor de game master). */
  showWarnings: { type: Boolean, default: false },
})

const TYPE_LABELS = {
  open: { label: 'Open vraag', icon: 'i-lucide-pencil-line' },
  single_choice: { label: 'Kies één antwoord', icon: 'i-lucide-circle-dot' },
  multiple_choice: { label: 'Meerdere antwoorden mogelijk', icon: 'i-lucide-list-checks' },
}
const typeInfo = computed(() => TYPE_LABELS[props.question.answerType] ?? { label: props.question.answerType, icon: 'i-lucide-help-circle' })

const isChoice = computed(() => props.question.options.length > 0 || props.question.answerType !== 'open')
const openAnswers = computed(() => {
  const value = props.question.correctAnswer
  if (value == null) return []
  return Array.isArray(value) ? value.map(String) : [String(value)]
})

/** Controle op invoerfouten in de database (alleen als het juiste antwoord bekend is). */
const warnings = computed(() => {
  const q = props.question
  if (!props.showWarnings || !('correctAnswer' in q)) return []
  const list = []
  const correct = q.options.filter(o => o.isCorrect).length
  if (q.answerType === 'open' && openAnswers.value.length === 0) list.push('Deze open vraag heeft geen correct_answer.')
  if (isChoice.value && q.options.length < 2) list.push('Deze keuzevraag heeft minder dan 2 opties (tabel question_options).')
  if (q.answerType === 'single_choice' && correct !== 1) list.push(`Een single_choice-vraag moet precies 1 goede optie hebben (nu ${correct}).`)
  if (q.answerType === 'multiple_choice' && correct === 0) list.push('Deze multiple_choice-vraag heeft geen goede optie.')
  return list
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Kop -->
    <div class="flex flex-wrap items-center gap-2">
      <UBadge size="lg" variant="soft" :label="`Vraag ${question.number} van ${question.total}`" />
      <UBadge size="lg" color="neutral" variant="outline" :icon="typeInfo.icon" :label="typeInfo.label" />
      <UBadge
        size="lg"
        color="neutral"
        variant="outline"
        icon="i-lucide-star"
        :label="`${question.points} ${question.points === 1 ? 'punt' : 'punten'}`"
      />
      <UBadge
        v-if="question.timeLimitSeconds"
        size="lg"
        color="neutral"
        variant="outline"
        icon="i-lucide-timer"
        :label="`${question.timeLimitSeconds} sec`"
      />
    </div>

    <UAlert
      v-for="warning in warnings"
      :key="warning"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="warning"
    />

    <!-- Vraagtekst -->
    <h2 class="text-3xl leading-tight font-bold text-balance md:text-5xl">
      {{ question.prompt }}
    </h2>

    <!-- Media (afbeeldingen / video / audio) -->
    <QuestionMedia v-if="question.media.length" :media="question.media" />

    <!-- Antwoordopties -->
    <QuestionOptions
      v-if="question.options.length"
      :options="question.options"
      :answer-type="question.answerType"
      :reveal="reveal"
    />

    <!-- Goed antwoord bij een open vraag -->
    <Transition
      enter-from-class="opacity-0 translate-y-2"
      enter-active-class="transition duration-300"
    >
      <div
        v-if="reveal && question.answerType === 'open' && openAnswers.length"
        class="flex items-center gap-4 rounded-2xl border-2 border-success bg-success/10 px-6 py-4"
      >
        <UIcon name="i-lucide-check-circle-2" class="size-10 shrink-0 text-success" />
        <div>
          <p class="text-sm text-muted">Goed antwoord</p>
          <p class="text-3xl font-bold">{{ openAnswers[0] }}</p>
          <p v-if="openAnswers.length > 1" class="text-sm text-muted">
            Ook goed: {{ openAnswers.slice(1).join(', ') }}
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>
