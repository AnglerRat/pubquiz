<script setup>
/**
 * Stand (tussenstand of eindstand) voor het grote scherm: podium voor de top 3, daaronder de rest.
 * <GameStandings :standings="standings" final />
 */
const props = defineProps({
  /** @type {import('vue').PropType<import('#shared/types').Standings>} */
  standings: { type: Object, required: true },
  /** Eindstand (podium + feestelijke kop) in plaats van tussenstand */
  final: { type: Boolean, default: false },
})

const players = computed(() => props.standings.players)
const top = computed(() => players.value.slice(0, 3))
const rest = computed(() => (props.final ? players.value.slice(3) : players.value))
const maxScore = computed(() => Math.max(1, props.standings.maxScore, ...players.value.map(p => p.score)))

// Podiumvolgorde: 2 – 1 – 3
const podium = computed(() => [top.value[1], top.value[0], top.value[2]].filter(Boolean))
const PODIUM = {
  1: { height: 'h-40', medal: 'text-amber-400', bar: 'bg-amber-400/20 border-amber-400' },
  2: { height: 'h-28', medal: 'text-zinc-400', bar: 'bg-zinc-400/15 border-zinc-400' },
  3: { height: 'h-20', medal: 'text-orange-700', bar: 'bg-orange-700/15 border-orange-700' },
}
const podiumStyle = rank => PODIUM[rank] ?? PODIUM[3]
</script>

<template>
  <div class="flex flex-col gap-8">
    <p v-if="players.length === 0" class="py-12 text-center text-muted">Nog geen spelers.</p>

    <!-- Podium -->
    <div v-if="final && podium.length" class="flex items-end justify-center gap-4 pt-4">
      <div
        v-for="p in podium"
        :key="p.id"
        class="flex w-44 flex-col items-center gap-2 md:w-56"
      >
        <UIcon
          :name="p.rank === 1 ? 'i-lucide-crown' : 'i-lucide-medal'"
          class="size-10"
          :class="podiumStyle(p.rank).medal"
        />
        <p class="w-full truncate text-center text-2xl font-bold" :title="p.name">{{ p.name }}</p>
        <p class="text-lg text-muted tabular-nums">{{ pointsLabel(p.score) }}</p>
        <div
          class="flex w-full items-start justify-center rounded-t-xl border-2 border-b-0 pt-3 text-4xl font-black"
          :class="[podiumStyle(p.rank).height, podiumStyle(p.rank).bar]"
        >
          {{ p.rank }}
        </div>
      </div>
    </div>

    <!-- Lijst -->
    <ol v-if="rest.length" class="flex flex-col gap-2">
      <li
        v-for="p in rest"
        :key="p.id"
        class="flex items-center gap-4 rounded-xl border border-default px-4 py-2.5"
      >
        <span class="w-8 shrink-0 text-right text-xl font-bold text-muted tabular-nums">{{ p.rank }}</span>
        <span class="w-56 shrink-0 truncate text-xl font-semibold" :title="p.name">{{ p.name }}</span>
        <div class="hidden h-2 flex-1 overflow-hidden rounded-full bg-elevated sm:block">
          <div
            class="h-full rounded-full bg-primary transition-[width] duration-700"
            :style="{ width: `${(p.score / maxScore) * 100}%` }"
          />
        </div>
        <span class="ml-auto shrink-0 text-sm text-muted tabular-nums">{{ p.correctCount }}/{{ standings.totalQuestions }} goed</span>
        <span class="w-24 shrink-0 text-right text-xl font-bold tabular-nums">{{ p.score }} <span class="text-sm font-normal text-muted">pnt</span></span>
      </li>
    </ol>
  </div>
</template>
