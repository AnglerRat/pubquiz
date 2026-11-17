<script setup>
const toast = useToast()
const name = ref('')
const creating = ref(false)
/** Elke kamer: { code, name, status, questionSetTitle, createdAt, playerCount } */
const rooms = ref([])
const loadingRooms = ref(true)

/** Vragensets uit de database: { id, title, description, questionCount } */
const questionSets = ref([])
const questionSetId = ref()
const setItems = computed(() => questionSets.value.map(s => ({
  label: `${s.title} (${s.questionCount} vragen)`,
  value: s.id,
  disabled: s.questionCount === 0,
})))
const selectedSet = computed(() => questionSets.value.find(s => s.id === questionSetId.value))

async function loadQuestionSets() {
  try {
    questionSets.value = await $fetch('/api/question-sets')
    questionSetId.value ??= questionSets.value.find(s => s.questionCount > 0)?.id
  }
  catch (e) {
    toast.add({ title: 'Vragensets laden mislukt', description: errorMessage(e), color: 'error' })
  }
}

const statusView = {
  lobby: { label: 'Lobby', color: 'warning' },
  playing: { label: 'Bezig', color: 'success' },
  finished: { label: 'Afgelopen', color: 'neutral' },
}

async function loadRooms() {
  try {
    rooms.value = await $fetch('/api/rooms/mine', {
      method: 'POST',
      body: { tokens: Object.values(getHostTokens()) },
    })
  }
  catch (e) {
    toast.add({ title: 'Kamers laden mislukt', description: errorMessage(e), color: 'error' })
  }
  finally {
    loadingRooms.value = false
  }
}

async function createRoom() {
  creating.value = true
  try {
    const res = await $fetch('/api/rooms', {
      method: 'POST',
      body: { name: name.value, questionSetId: questionSetId.value },
    })
    saveHostToken(res.code, res.hostToken)
    await navigateTo(`/host/${res.code}`)
  }
  catch (e) {
    toast.add({ title: 'Kamer aanmaken mislukt', description: errorMessage(e), color: 'error' })
  }
  finally {
    creating.value = false
  }
}

async function deleteRoom(room) {
  if (!confirm(`Kamer "${room.name}" (${room.code}) verwijderen? Spelers worden eruit gezet.`)) return
  try {
    await $fetch(`/api/rooms/${room.code}`, {
      method: 'DELETE',
      headers: { 'x-host-token': getHostToken(room.code) ?? '' },
    })
    removeHostToken(room.code)
    rooms.value = rooms.value.filter(r => r.code !== room.code)
  }
  catch (e) {
    toast.add({ title: 'Verwijderen mislukt', description: errorMessage(e), color: 'error' })
  }
}

function roomLink(room) {
  return room.status === 'playing' ? `/host/${room.code}/game` : `/host/${room.code}`
}

onMounted(() => {
  loadRooms()
  loadQuestionSets()
})
</script>

<template>
  <div class="mx-auto grid max-w-5xl gap-6 px-4 py-8 md:grid-cols-[360px_1fr]">
    <UCard>
      <template #header>
        <h2 class="font-semibold">Nieuwe kamer</h2>
        <p class="text-sm text-muted">Spelers joinen via de QR-code op het grote scherm.</p>
      </template>
      <form class="space-y-4" @submit.prevent="createRoom">
        <UFormField label="Vragenset" :description="selectedSet?.description ?? undefined">
          <USelect
            v-model="questionSetId"
            :items="setItems"
            placeholder="Kies een vragenset"
            class="w-full"
          />
        </UFormField>
        <UAlert
          v-if="questionSets.length === 0"
          color="warning"
          variant="subtle"
          icon="i-lucide-database"
          title="Nog geen vragensets"
          description="Voeg ze toe in de database (tabel question_sets), of draai npm run db:seed."
        />
        <UFormField label="Naam van de kamer" hint="Optioneel">
          <UInput v-model="name" :placeholder="selectedSet?.title ?? 'Bijv. Vrijdagavond quiz'" maxlength="100" class="w-full" />
        </UFormField>
        <UButton
          type="submit"
          block
          icon="i-lucide-plus"
          :loading="creating"
          :disabled="!questionSetId"
          label="Kamer aanmaken"
        />
      </form>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">Mijn kamers</h2>
          <UButton variant="ghost" color="neutral" icon="i-lucide-refresh-cw" size="sm" @click="loadRooms" />
        </div>
      </template>

      <div v-if="loadingRooms" class="space-y-2">
        <USkeleton v-for="i in 3" :key="i" class="h-12 w-full" />
      </div>
      <p v-else-if="rooms.length === 0" class="py-6 text-center text-muted">
        Nog geen kamers op dit apparaat.
      </p>
      <ul v-else class="divide-y divide-default">
        <li v-for="room in rooms" :key="room.code" class="flex items-center gap-3 py-3">
          <span class="rounded-md bg-elevated px-2 py-1 font-mono text-sm font-semibold tracking-widest">{{ room.code }}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium">{{ room.name }}</p>
            <p class="text-xs text-muted">
              <template v-if="room.questionSetTitle">{{ room.questionSetTitle }} · </template>
              {{ room.playerCount }} speler{{ room.playerCount === 1 ? '' : 's' }} ·
              {{ new Date(room.createdAt).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' }) }}
            </p>
          </div>
          <UBadge :color="statusView[room.status].color" variant="subtle" :label="statusView[room.status].label" />
          <UButton :to="roomLink(room)" size="sm" variant="soft" trailing-icon="i-lucide-arrow-right" label="Open" />
          <UButton size="sm" variant="ghost" color="error" icon="i-lucide-trash-2" @click="deleteRoom(room)" />
        </li>
      </ul>
    </UCard>
  </div>
</template>
