<script setup>
/**
 * Eindstand op de telefoon: eigen plek en score, de top van de ranglijst en
 * een knop om de score als afbeelding op te slaan of te delen.
 *
 * <PlayerFinalScore :code="code" :room-name="room.name" :player-id="session.playerId" />
 */
const props = defineProps({
  code: { type: String, required: true },
  roomName: { type: String, default: '' },
  playerId: { type: Number, required: true },
})

/** @type {import('vue').Ref<import('#shared/types').Standings | null>} */
const standings = ref(null)
const loadError = ref(null)

async function load() {
  try {
    standings.value = await $fetch(`/api/rooms/${props.code}/standings`)
    loadError.value = null
  }
  catch (e) {
    loadError.value = errorMessage(e)
  }
}
onMounted(load)
defineExpose({ refresh: load })

const players = computed(() => standings.value?.players ?? [])
const me = computed(() => players.value.find(p => p.id === props.playerId) ?? null)
const sharedRank = computed(() => !!me.value && players.value.filter(p => p.rank === me.value.rank).length > 1)
const top = computed(() => players.value.slice(0, 5))
const meOutsideTop = computed(() => !!me.value && !top.value.some(p => p.id === me.value.id))

const headline = computed(() => {
  const rank = me.value?.rank;
  return null;
})

// --- Afbeelding ---
const imageUrl = ref(null)
const saving = ref(false)
const saveError = ref(null)
const saveResult = ref(null)

async function saveImage() {
  if (!me.value || !standings.value) return
  saving.value = true
  saveError.value = null
  try {
    const blob = await renderScoreImage({
      roomName: props.roomName,
      playerName: me.value.name,
      rank: me.value.rank,
      shared: sharedRank.value,
      playerCount: players.value.length,
      score: me.value.score,
      maxScore: standings.value.maxScore,
      correctCount: me.value.correctCount,
      totalQuestions: standings.value.totalQuestions,
    })
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
    imageUrl.value = URL.createObjectURL(blob)
    const safeName = me.value.name.replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'speler'
    saveResult.value = await shareOrDownload(blob, `pubquiz-${safeName}.png`)
  }
  catch (e) {
    saveError.value = e?.message ?? 'Opslaan mislukt'
  }
  finally {
    saving.value = false
  }
}
onBeforeUnmount(() => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
})
</script>

<template>
  <div v-if="loadError" class="player-card">
    <h1 class="player-title">De quiz is afgelopen</h1>
    <p class="player-error">{{ loadError }}</p>
    <button type="button" class="player-button mt-5" @click="load">Opnieuw proberen</button>
  </div>

  <div v-else-if="!standings" class="player-card text-slate-600">Eindstand laden…</div>

  <template v-else>
    <!-- Eigen resultaat -->
    <div class="player-card text-center">
      <p class="player-chip">Eindstand</p>
      <h1 class="player-title mt-4">{{ headline }}</h1>

      <template v-if="me">
        <div
          class="mx-auto mt-5 flex size-36 items-center justify-center rounded-full border-[4px] border-show-ink text-6xl font-black shadow-[5px_5px_0_var(--color-show-ink)]"
          :class="me.rank === 1 ? 'bg-show-yellow' : me.rank <= 3 ? 'bg-show-sky' : 'bg-white'"
        >
          {{ ordinal(me.rank) }}
        </div>
        <!-- <p class="mt-4 text-slate-600">
          {{ sharedRank ? 'Gedeelde plek' : 'Plek' }} van {{ players.length }} {{ players.length === 1 ? 'speler' : 'spelers' }}
        </p> -->

        <dl class="mt-5 grid grid-cols-2 gap-3">
          <div class="rounded-xl border-[3px] border-show-ink bg-show-yellow px-3 py-3">
            <dt class="text-sm font-extrabold tracking-wide uppercase">Punten</dt>
            <dd class="text-4xl font-black tabular-nums">{{ me.score }}</dd>
            <dd v-if="standings.maxScore" class="text-sm">van {{ standings.maxScore }}</dd>
          </div>
          <div class="rounded-xl border-[3px] border-show-ink bg-show-sky px-3 py-3">
            <dt class="text-sm font-extrabold tracking-wide uppercase">Goed</dt>
            <dd class="text-4xl font-black tabular-nums">{{ me.correctCount }}</dd>
            <dd class="text-sm">van {{ standings.totalQuestions }} vragen</dd>
          </div>
        </dl>

        <button type="button" class="player-button mt-6" :disabled="saving" @click="saveImage">
          {{ saving ? 'Even geduld…' : 'Bewaar als afbeelding' }}
        </button>
        <p v-if="saveError" role="alert" class="player-error">{{ saveError }}</p>
        <template v-if="imageUrl">
          <img :src="imageUrl" alt="Jouw eindscore als afbeelding" class="mx-auto mt-5 w-2/3 rounded-xl border-[3px] border-show-ink">
          <p class="player-hint">
            {{ saveResult === 'downloaded' ? 'De afbeelding is gedownload.' : '' }}
          </p>
        </template>
      </template>
    </div>

    <!-- Ranglijst -->
    <div class="player-card">
      <h2 class="text-2xl font-extrabold">Ranglijst</h2>
      <ol class="mt-4 flex flex-col gap-2">
        <li
          v-for="p in top"
          :key="p.id"
          class="flex items-center gap-3 rounded-xl border-2 px-3 py-2"
          :class="p.id === playerId ? 'border-show-ink bg-show-yellow/40' : 'border-slate-200'"
        >
          <span class="w-8 shrink-0 text-right text-xl font-black tabular-nums">{{ p.rank }}</span>
          <span class="min-w-0 flex-1 truncate font-bold">{{ p.name }}</span>
          <span class="shrink-0 font-extrabold tabular-nums">{{ p.score }} <span class="text-sm font-medium text-slate-500">pnt</span></span>
        </li>
        <template v-if="meOutsideTop">
          <li class="text-center text-slate-400" aria-hidden="true">⋯</li>
          <li class="flex items-center gap-3 rounded-xl border-2 border-show-ink bg-show-yellow/40 px-3 py-2">
            <span class="w-8 shrink-0 text-right text-xl font-black tabular-nums">{{ me.rank }}</span>
            <span class="min-w-0 flex-1 truncate font-bold">{{ me.name }}</span>
            <span class="shrink-0 font-extrabold tabular-nums">{{ me.score }} <span class="text-sm font-medium text-slate-500">pnt</span></span>
          </li>
        </template>
      </ol>
    </div>

    <NuxtLink to="/" class="player-link self-center">Naar het begin</NuxtLink>
  </template>
</template>
