<script setup>
definePageMeta({ layout: 'player' })

const route = useRoute()
const code = String(route.params.code).toUpperCase()

const { session, room, me, loading, socketStatus, leave } = usePlayerRoom(code, {
  game_started: () => navigateTo(`/play/${code}/game`),
})

// Kom je binnen terwijl het spel al loopt of klaar is (bijv. na een refresh)? Door naar het spelscherm (incl. eindstand).
watch(() => room.value?.status, (status) => {
  if (status === 'playing' || status === 'finished') navigateTo(`/play/${code}/game`, { replace: true })
})

const playerCount = computed(() => room.value?.players.length ?? 0)

function confirmLeave() {
  if (confirm('Weet je zeker dat je wilt stoppen met deze quiz?')) leave()
}
</script>

<template>
  <PlayerConnectionDot :status="socketStatus" />

  <div v-if="loading || !room" class="player-card text-slate-600">Laden…</div>

  <div v-else-if="room.status === 'finished'" class="player-card">
    <h1 class="player-title">De quiz is afgelopen</h1>
    <p class="mt-3">Bedankt voor het meedoen!</p>
  </div>

  <template v-else>
    <div class="player-card">
      <p class="player-chip">{{ room.name }}</p>
      <p class="mt-5 text-slate-600">Je speelt mee als</p>
      <h1 class="player-title text-4xl font-black break-words">{{ me?.name ?? session?.name }}</h1>

      <div class="mt-6 flex items-center gap-3 rounded-xl border-2 border-show-ink bg-show-sky px-4 py-3">
        <span class="relative flex size-3 shrink-0" aria-hidden="true">
          <span class="absolute inline-flex size-full animate-ping rounded-full bg-show-coral opacity-60" />
          <span class="relative inline-flex size-3 rounded-full bg-show-coral" />
        </span>
        <p class="font-bold">Wachten tot de quiz begint</p>
      </div>
      <p class="mt-3 text-base text-slate-600">Je hoeft niets te doen. Dit scherm gaat vanzelf verder.</p>

      <dl class="mt-6 grid grid-cols-2 gap-3 border-t-2 border-dashed border-slate-300 pt-5 text-base">
        <div>
          <dt class="text-slate-500">Code</dt>
          <dd class="text-2xl font-extrabold tracking-widest">{{ room.code }}</dd>
        </div>
        <div>
          <dt class="text-slate-500">Spelers</dt>
          <dd class="text-2xl font-extrabold">{{ playerCount }}</dd>
        </div>
      </dl>
    </div>

    <button type="button" class="player-link self-center" @click="confirmLeave">
      Stoppen met de quiz
    </button>
  </template>
</template>
