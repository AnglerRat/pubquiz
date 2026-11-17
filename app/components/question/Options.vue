<script setup>
/**
 * Antwoordopties van een keuzevraag als gekleurde tegels (A, B, C, ...).
 * Met `reveal` worden de goede opties gemarkeerd en de foute gedimd.
 */
const props = defineProps({
  /** @type {import('vue').PropType<import('#shared/types').QuestionOption[]>} */
  options: { type: Array, required: true },
  answerType: { type: String, required: true },
  reveal: { type: Boolean, default: false },
})

// Vaste kleur per positie (OPTION_COLORS in app/utils/answers.js), zodat spelers "A = paars" kunnen onthouden
const canReveal = computed(() => props.reveal && props.options.some(o => 'isCorrect' in o))
const columns = computed(() => (props.options.length <= 2 || props.options.length === 4 ? 'md:grid-cols-2' : 'md:grid-cols-3'))
</script>

<template>
  <div class="grid grid-cols-1 gap-3" :class="columns">
    <div
      v-for="(option, i) in options"
      :key="option.id"
      class="relative flex items-center gap-4 rounded-2xl border-2 p-4 transition duration-300"
      :class="[
        canReveal && option.isCorrect ? 'border-success bg-success/10 scale-[1.02]' : 'border-default bg-elevated',
        canReveal && !option.isCorrect ? 'opacity-35' : '',
      ]"
    >
      <span
        class="flex size-12 shrink-0 items-center justify-center text-2xl font-bold text-white"
        :class="[optionColor(i), answerType === 'multiple_choice' ? 'rounded-lg' : 'rounded-full']"
      >{{ optionLetter(i) }}</span>
      <span class="flex-1 text-2xl font-semibold md:text-3xl">{{ option.label }}</span>
      <UIcon
        v-if="canReveal && option.isCorrect"
        name="i-lucide-check-circle-2"
        class="size-9 shrink-0 text-success"
      />
    </div>
  </div>
</template>
