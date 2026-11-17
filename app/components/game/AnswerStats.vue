<script setup>
/**
 * Live antwoorden voor de game master: wie heeft geantwoord, verdeling per optie / gegroepeerde open
 * antwoorden, en handmatig goed- of afkeuren.
 *
 * De details (wát er geantwoord is) staan standaard dicht zolang het antwoord niet onthuld is,
 * omdat dit scherm meestal ook het grote scherm is.
 *
 * <GameAnswerStats :question="question" :stats="stats" :players="room.players" @grade="..." />
 */
const props = defineProps({
  /** @type {import('vue').PropType<import('#shared/types').PublicQuestion>} */
  question: { type: Object, required: true },
  /** @type {import('vue').PropType<import('#shared/types').QuestionStats | null>} */
  stats: { type: Object, default: null },
  /** @type {import('vue').PropType<import('#shared/types').PublicPlayer[]>} */
  players: { type: Array, default: () => [] },
})
const emit = defineEmits(['grade'])

const revealed = computed(() => !!props.question.state?.revealed)
const peek = ref(false)
const showDetails = computed(() => revealed.value || peek.value)
watch(() => props.question.id, () => { peek.value = false })

const answeredIds = computed(() => new Set(props.stats?.answers.map(a => a.playerId) ?? []))
const answeredCount = computed(() => props.stats?.answeredCount ?? 0)
const playerCount = computed(() => props.players.length || props.stats?.playerCount || 0)
const percent = (n, total) => (total ? Math.round((n / total) * 100) : 0)

const optionRows = computed(() => props.question.options.map((o, i) => ({
  ...o,
  index: i,
  count: props.stats?.optionCounts?.[o.id] ?? 0,
})))
const maxOptionCount = computed(() => Math.max(1, ...optionRows.value.map(o => o.count)))

const isOpen = computed(() => props.question.answerType === 'open')
const ungraded = computed(() => props.stats?.answers.filter(a => a.isCorrect == null).length ?? 0)
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Kop: aantal antwoorden -->
    <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
      <div class="flex items-baseline gap-2">
        <span class="text-3xl font-bold tabular-nums">{{ answeredCount }}</span>
        <span class="text-muted">/ {{ playerCount }} geantwoord</span>
      </div>
      <div v-if="revealed && stats" class="flex items-baseline gap-2">
        <span class="text-3xl font-bold text-success tabular-nums">{{ stats.correctCount }}</span>
        <span class="text-muted">goed ({{ percent(stats.correctCount, answeredCount) }}%)</span>
      </div>
      <div class="ml-auto">
        <UButton
          v-if="!revealed"
          size="sm"
          color="neutral"
          variant="ghost"
          :icon="peek ? 'i-lucide-eye-off' : 'i-lucide-eye'"
          :label="peek ? 'Verberg antwoorden' : 'Bekijk antwoorden'"
          @click="peek = !peek"
        />
      </div>
    </div>
    <UProgress :model-value="percent(answeredCount, playerCount)" size="sm" />

    <!-- Wie heeft geantwoord -->
    <ul class="flex flex-wrap gap-2">
      <li
        v-for="p in players"
        :key="p.id"
        class="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors"
        :class="answeredIds.has(p.id) ? 'border-primary bg-primary/10 text-highlighted' : 'border-default text-muted'"
      >
        <UIcon v-if="answeredIds.has(p.id)" name="i-lucide-check" class="size-3.5 text-primary" />
        {{ p.name }}
      </li>
    </ul>

    <template v-if="showDetails && stats">
      <USeparator />

      <!-- Keuzevraag: verdeling per optie -->
      <div v-if="!isOpen" class="flex flex-col gap-2">
        <div v-for="o in optionRows" :key="o.id" class="flex items-center gap-3">
          <span
            class="flex size-8 shrink-0 items-center justify-center text-sm font-bold text-white"
            :class="[optionColor(o.index), question.answerType === 'multiple_choice' ? 'rounded-md' : 'rounded-full']"
          >{{ optionLetter(o.index) }}</span>
          <span class="w-48 shrink-0 truncate font-medium" :title="o.label">{{ o.label }}</span>
          <div class="h-6 flex-1 overflow-hidden rounded-md bg-elevated">
            <div
              class="h-full rounded-md transition-[width] duration-500"
              :class="[optionColor(o.index), revealed && !o.isCorrect ? 'opacity-30' : '']"
              :style="{ width: `${(o.count / maxOptionCount) * 100}%` }"
            />
          </div>
          <span class="w-20 shrink-0 text-right tabular-nums">
            <span class="font-semibold">{{ o.count }}</span>
            <span class="text-muted"> · {{ percent(o.count, answeredCount) }}%</span>
          </span>
          <UIcon
            :name="revealed && o.isCorrect ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
            class="size-5 shrink-0"
            :class="revealed && o.isCorrect ? 'text-success' : 'invisible'"
          />
        </div>
      </div>

      <!-- Open vraag: gegroepeerde antwoorden, met goed/fout keuren -->
      <div v-else class="flex flex-col gap-2">
        <p v-if="stats.groups.length === 0" class="text-muted">Nog geen antwoorden.</p>
        <UAlert
          v-if="ungraded"
          color="warning"
          variant="subtle"
          icon="i-lucide-scale"
          :title="`${ungraded} antwoord${ungraded === 1 ? '' : 'en'} nog niet beoordeeld`"
          description="Er is geen goed antwoord ingevoerd voor deze vraag. Keur ze hieronder goed of fout."
        />
        <div
          v-for="g in stats.groups"
          :key="g.answerIds.join()"
          class="flex items-center gap-3 rounded-lg border px-3 py-2"
          :class="g.isCorrect === true ? 'border-success/60 bg-success/5' : g.isCorrect === false ? 'border-default' : 'border-warning/60 bg-warning/5'"
        >
          <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-elevated text-sm font-bold tabular-nums">
            {{ g.count }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-lg font-semibold">{{ g.text }}</p>
            <p class="truncate text-xs text-muted">{{ g.playerNames.join(', ') }}</p>
          </div>
          <UFieldGroup size="sm">
            <UButton
              icon="i-lucide-check"
              :color="g.isCorrect === true ? 'success' : 'neutral'"
              :variant="g.isCorrect === true ? 'solid' : 'outline'"
              aria-label="Goed rekenen"
              @click="emit('grade', g.answerIds, true)"
            />
            <UButton
              icon="i-lucide-x"
              :color="g.isCorrect === false ? 'error' : 'neutral'"
              :variant="g.isCorrect === false ? 'solid' : 'outline'"
              aria-label="Fout rekenen"
              @click="emit('grade', g.answerIds, false)"
            />
          </UFieldGroup>
        </div>
      </div>
    </template>
  </div>
</template>
