<script setup>
/**
 * Subtiele timer: dunne balk die leegloopt + resterende seconden. Niets zichtbaar zonder tijdslimiet.
 * <QuestionTimer :state="question.state" />                  (game master, Nuxt UI-stijl)
 * <QuestionTimer :state="question.state" variant="player" /> (spelersscherm, spelshow-stijl)
 */
const props = defineProps({
  /** @type {import('vue').PropType<import('#shared/types').QuestionState | null>} */
  state: { type: Object, default: null },
  variant: { type: String, default: 'host' },
})

const { hasTimer, seconds, fraction, expired } = useCountdown(() => props.state)
const stopped = computed(() => !!props.state?.locked && !expired.value) // gesloten door onthullen
const urgent = computed(() => hasTimer.value && !expired.value && !stopped.value && seconds.value <= 5)

const label = computed(() => {
  if (expired.value) return 'Tijd is om'
  if (stopped.value) return 'Gesloten'
  const s = seconds.value
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`
})
const width = computed(() => `${Math.max(0, Math.min(1, stopped.value ? 0 : fraction.value ?? 0)) * 100}%`)
</script>

<template>
  <div
    v-if="hasTimer"
    class="flex items-center gap-3"
    role="timer"
    :aria-label="expired ? 'De tijd is om' : `Nog ${seconds} seconden`"
  >
    <!-- Game master -->
    <template v-if="variant === 'host'">
      <UIcon
        name="i-lucide-timer"
        class="size-4 shrink-0"
        :class="urgent ? 'text-error' : 'text-muted'"
      />
      <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
        <div
          class="h-full rounded-full transition-[width] duration-200 ease-linear"
          :class="urgent ? 'bg-error' : 'bg-primary'"
          :style="{ width }"
        />
      </div>
      <span
        class="min-w-16 text-right text-sm font-semibold tabular-nums"
        :class="urgent ? 'text-error' : expired || stopped ? 'text-muted' : ''"
      >{{ label }}</span>
    </template>

    <!-- Speler -->
    <template v-else>
      <div class="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-show-ink bg-white">
        <div
          class="h-full transition-[width] duration-200 ease-linear"
          :class="urgent ? 'bg-show-coral' : 'bg-show-yellow'"
          :style="{ width }"
        />
      </div>
      <span
        class="min-w-14 text-right text-base font-extrabold tabular-nums"
        :class="urgent ? 'text-show-coral' : expired || stopped ? 'text-slate-500' : 'text-show-ink'"
      >{{ label }}</span>
    </template>
  </div>
</template>
