<script setup>
/**
 * Antwoord invullen op de telefoon.
 *  - open vraag        → tekstveld + versturen
 *  - single_choice     → tik op een optie = meteen versturen (opnieuw tikken = wijzigen)
 *  - multiple_choice   → opties aan/uit zetten + versturen
 * Na het onthullen worden goede opties groen en een fout gekozen optie rood.
 *
 * <PlayerAnswerForm :key="question.id" :question="question" :closed="closed" :sending="sending" @submit="send" />
 */
const props = defineProps({
  /** @type {import('vue').PropType<import('#shared/types').PublicQuestion>} */
  question: { type: Object, required: true },
  /** Antwoorden kan niet (meer): tijd om of gesloten */
  closed: { type: Boolean, default: false },
  sending: { type: Boolean, default: false },
})
const emit = defineEmits(['submit'])

const saved = computed(() => props.question.myAnswer?.answer ?? null)
const revealed = computed(() => !!props.question.state?.revealed)
const isOpen = computed(() => props.question.answerType === 'open')
const isMulti = computed(() => props.question.answerType === 'multiple_choice')

const text = ref(saved.value?.text ?? '')
const selected = ref(new Set(saved.value?.optionIds ?? []))

// Opgeslagen antwoord verandert (bijv. na herverbinden): formulier bijwerken.
watch(saved, (value) => {
  if (value?.text != null) text.value = value.text
  if (value?.optionIds) selected.value = new Set(value.optionIds)
})

const changed = computed(() => {
  if (isOpen.value) return text.value.trim() !== (saved.value?.text ?? '')
  const savedIds = saved.value?.optionIds ?? []
  return selected.value.size !== savedIds.length || savedIds.some(id => !selected.value.has(id))
})

function pick(option) {
  if (props.closed || props.sending) return
  if (isMulti.value) {
    const next = new Set(selected.value)
    if (next.has(option.id)) next.delete(option.id)
    else next.add(option.id)
    selected.value = next
  }
  else {
    selected.value = new Set([option.id])
    emit('submit', { optionId: option.id })
  }
}

function submit() {
  if (props.closed || props.sending) return
  if (isOpen.value) emit('submit', { text: text.value })
  else emit('submit', { optionIds: [...selected.value] })
}

function tileClass(option) {
  const isSelected = selected.value.has(option.id)
  if (revealed.value && 'isCorrect' in option) {
    if (option.isCorrect) return 'border-emerald-600 bg-emerald-50 ring-4 ring-emerald-500/40'
    if (isSelected) return 'border-show-coral bg-show-coral/10'
    return 'border-show-ink/30 bg-white opacity-60'
  }
  if (isSelected) return 'border-show-ink bg-show-yellow shadow-[3px_3px_0_var(--color-show-ink)]'
  return 'border-show-ink bg-white shadow-[3px_3px_0_var(--color-show-ink)]'
}
</script>

<template>
  <!-- Open vraag -->
  <form v-if="isOpen" @submit.prevent="submit">
    <label for="answer" class="player-label">Jouw antwoord</label>
    <input
      id="answer"
      v-model="text"
      maxlength="200"
      autocomplete="off"
      enterkeyhint="send"
      class="player-input mt-3"
      :disabled="closed"
      :class="closed ? 'bg-slate-100' : ''"
    >
    <button
      v-if="!closed"
      type="submit"
      class="player-button mt-4"
      :disabled="sending || !text.trim() || (!changed && !!saved)"
    >
      {{ sending ? 'Versturen…' : saved ? (changed ? 'Antwoord wijzigen' : 'Verstuurd ✓') : 'Versturen' }}
    </button>
  </form>

  <!-- Keuzevraag -->
  <div v-else>
    <p class="player-label">{{ isMulti ? 'Kies één of meer antwoorden' : 'Kies je antwoord' }}</p>
    <div class="mt-3 flex flex-col gap-3" role="group">
      <button
        v-for="(option, i) in question.options"
        :key="option.id"
        type="button"
        class="flex w-full items-center gap-3 rounded-xl border-[3px] px-3 py-3 text-left transition-[transform,box-shadow,background-color] duration-100 active:translate-x-[2px] active:translate-y-[2px] disabled:active:translate-none"
        :class="tileClass(option)"
        :aria-pressed="selected.has(option.id)"
        :disabled="closed || sending"
        @click="pick(option)"
      >
        <span
          class="flex size-10 shrink-0 items-center justify-center border-2 border-show-ink text-xl font-black text-white"
          :class="[optionColor(i), isMulti ? 'rounded-lg' : 'rounded-full']"
        >{{ optionLetter(i) }}</span>
        <span class="flex-1 text-xl font-bold">{{ option.label }}</span>
        <UIcon
          v-if="revealed && option.isCorrect"
          name="i-lucide-check-circle-2"
          class="size-7 shrink-0 text-emerald-600"
        />
        <UIcon
          v-else-if="selected.has(option.id)"
          :name="isMulti ? 'i-lucide-square-check' : 'i-lucide-circle-check'"
          class="size-7 shrink-0"
        />
      </button>
    </div>
    <button
      v-if="isMulti && !closed"
      type="button"
      class="player-button mt-5"
      :disabled="sending || selected.size === 0 || (!changed && !!saved)"
      @click="submit"
    >
      {{ sending ? 'Versturen…' : saved ? (changed ? 'Antwoord wijzigen' : 'Verstuurd ✓') : 'Versturen' }}
    </button>
  </div>
</template>
