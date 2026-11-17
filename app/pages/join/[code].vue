<script setup>
definePageMeta({ layout: 'player' })

const route = useRoute()
const code = String(route.params.code).toUpperCase()

const room = ref(null)
const loadError = ref(null)
const loading = ref(true)
const name = ref('')
const submitting = ref(false)
const formError = ref(null)
const removed = computed(() => route.query.removed === '1')

onMounted(async () => {
  // Al in deze kamer? Dan direct door naar de wachtruimte.
  const existing = getPlayerSession(code)
  if (existing) {
    try {
      await $fetch(`/api/rooms/${code}/players/me`, { headers: { 'x-player-token': existing.token } })
      return navigateTo(`/play/${code}`, { replace: true })
    }
    catch {
      clearPlayerSession(code)
    }
  }

  try {
    room.value = await $fetch(`/api/rooms/${code}`)
  }
  catch (e) {
    loadError.value = errorStatus(e) === 404
      ? `Er is geen quiz met code ${code}. Controleer de code op het grote scherm.`
      : errorMessage(e)
  }
  finally {
    loading.value = false
  }
})

async function join() {
  formError.value = null
  if (name.value.trim().length < 2) {
    formError.value = 'Vul een naam in van minimaal 2 tekens.'
    return
  }
  submitting.value = true
  try {
    const res = await $fetch(`/api/rooms/${code}/players`, {
      method: 'POST',
      body: { name: name.value },
    })
    savePlayerSession(code, { playerId: res.playerId, token: res.token, name: res.name })
    await navigateTo(`/play/${code}`, { replace: true })
  }
  catch (e) {
    formError.value = errorMessage(e)
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="loading" class="player-card text-slate-600">Laden…</div>

  <div v-else-if="loadError" class="player-card">
    <h1 class="player-title">Quiz niet gevonden</h1>
    <p class="mt-3">{{ loadError }}</p>
    <NuxtLink to="/" class="player-button mt-6">Andere code invullen</NuxtLink>
  </div>

  <div v-else-if="room && room.status !== 'lobby'" class="player-card">
    <p class="player-chip">{{ room.name }}</p>
    <h1 class="player-title mt-3">
      {{ room.status === 'finished' ? 'Deze quiz is afgelopen' : 'Deze quiz is al begonnen' }}
    </h1>
    <p v-if="room.status !== 'finished'" class="mt-3">Meedoen kan helaas niet meer.</p>
  </div>

  <div v-else-if="room" class="player-card">
    <p class="player-chip">{{ room.name }}</p>
    <h1 class="player-title mt-3">Hoe heet je?</h1>

    <p v-if="removed" class="player-notice mt-4">
      De quizmaster heeft je uit de quiz gehaald. Je kunt opnieuw meedoen.
    </p>

    <form class="mt-6" @submit.prevent="join">
      <label for="name" class="player-label">Jouw naam</label>
      <p id="name-hint" class="player-hint">Of een teamnaam. Iedereen ziet deze op het scherm.</p>
      <input
        id="name"
        v-model="name"
        aria-describedby="name-hint"
        maxlength="20"
        autocomplete="nickname"
        autocapitalize="words"
        enterkeyhint="go"
        class="player-input mt-3"
        :aria-invalid="!!formError"
        @input="formError = null"
      >
      <p v-if="formError" role="alert" class="player-error">{{ formError }}</p>
      <button type="submit" class="player-button mt-5" :disabled="submitting">
        {{ submitting ? 'Even geduld…' : 'Meedoen' }}
      </button>
    </form>
  </div>
</template>
