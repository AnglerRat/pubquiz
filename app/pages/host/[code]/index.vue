<script setup>
/**
 * Lobby voor de game master — bedoeld voor het grote scherm.
 * Toont de QR-code + alle deelnemers live, en de knop om het spel te starten.
 */
const route = useRoute()
const code = String(route.params.code).toUpperCase()
const toast = useToast()

const { room, error, loading, socketStatus, start, kick } = useHostRoom(code, {
  game_started: () => navigateTo(`/host/${code}/game`),
})
const { joinUrl, baseUrl, addresses, selectedAddress } = useJoinUrl(code)

// Spel al bezig (bijv. na refresh)? Door naar het spelscherm.
watch(() => room.value?.status, (status) => {
  if (status === 'playing') navigateTo(`/host/${code}/game`, { replace: true })
})

const players = computed(() => room.value?.players ?? [])
const onlineCount = computed(() => players.value.filter(p => p.isConnected).length)
const starting = ref(false)

async function startGame() {
  starting.value = true
  try {
    await start()
    await navigateTo(`/host/${code}/game`)
  }
  catch (e) {
    toast.add({ title: 'Starten mislukt', description: errorMessage(e), color: 'error' })
  }
  finally {
    starting.value = false
  }
}

async function kickPlayer(id, name) {
  try {
    await kick(id)
    toast.add({ title: `${name} is verwijderd`, color: 'neutral' })
  }
  catch (e) {
    toast.add({ title: 'Verwijderen mislukt', description: errorMessage(e), color: 'error' })
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen()
  else document.documentElement.requestFullscreen()
}

async function copyLink() {
  await navigator.clipboard?.writeText(joinUrl.value)
  toast.add({ title: 'Link gekopieerd', color: 'success' })
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-6">
    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :title="error">
      <template #actions>
        <UButton to="/host" color="neutral" variant="outline" label="Naar mijn kamers" />
      </template>
    </UAlert>

    <div v-else-if="loading || !room" class="grid gap-6 lg:grid-cols-[420px_1fr]">
      <USkeleton class="h-[560px]" />
      <USkeleton class="h-[560px]" />
    </div>

    <template v-else>
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold">{{ room.name }}</h1>
          <p class="text-muted">Scan de QR-code om mee te doen</p>
        </div>
        <div class="flex items-center gap-2">
          <ConnectionBadge :status="socketStatus" />
          <UButton variant="ghost" color="neutral" icon="i-lucide-maximize" @click="toggleFullscreen" />
          <UButton
            size="xl"
            icon="i-lucide-play"
            label="Start spel"
            :loading="starting"
            :disabled="players.length === 0 || room.status !== 'lobby'"
            @click="startGame"
          />
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[420px_1fr]">
        <!-- QR-code -->
        <UCard>
          <div class="flex flex-col items-center gap-4">
            <div class="w-full max-w-[360px] rounded-2xl bg-white p-3 shadow-sm">
              <QrCode :value="joinUrl" />
            </div>
            <div class="text-center">
              <p class="mt-2 text-lg text-muted">Kamercode:</p>
              <p class="font-mono text-6xl font-bold tracking-[0.2em]">{{ room.code }}</p>
            </div>
            <div class="flex w-full items-center gap-2">
              <UInput :model-value="joinUrl" readonly class="flex-1" size="sm" />
              <UButton size="sm" variant="soft" color="neutral" icon="i-lucide-copy" @click="copyLink" />
            </div>
            <UFormField
              v-if="addresses.length > 1"
              label="Netwerkadres voor de QR-code"
              class="w-full"
              size="sm"
            >
              <USelect v-model="selectedAddress" :items="addresses" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <!-- Deelnemers -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">
                Deelnemers
                <span class="text-muted">({{ players.length }})</span>
              </h2>
              <span class="text-sm text-muted">{{ onlineCount }} online</span>
            </div>
          </template>

          <div v-if="players.length === 0" class="flex flex-col items-center justify-center py-24 text-center text-muted">
            <UIcon name="i-lucide-users" class="mb-3 size-12" />
            <p class="text-lg">Wachten op spelers…</p>
          </div>

          <ul v-else class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2">
            <li
              v-for="p in players"
              :key="p.id"
              class="group flex items-center gap-2 rounded-lg border border-default px-3 py-2"
              :class="{ 'text-muted': !p.isConnected }"
              :title="p.isConnected ? 'Verbonden' : 'Niet verbonden'"
            >
              <span class="size-2 shrink-0 rounded-full" :class="p.isConnected ? 'bg-success' : 'bg-error'" />
              <span class="min-w-0 flex-1 truncate text-xl font-medium">{{ p.name }}</span>
              <UButton
                class="opacity-0 group-hover:opacity-100 focus:opacity-100"
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-lucide-x"
                :aria-label="`${p.name} verwijderen`"
                @click="kickPlayer(p.id, p.name)"
              />
            </li>
          </ul>
        </UCard>
      </div>
    </template>
  </div>
</template>
