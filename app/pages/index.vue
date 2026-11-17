<script setup>
definePageMeta({ layout: 'player' })

const route = useRoute()
const code = ref('')
const closed = computed(() => route.query.closed === '1')
const error = ref(null)

function join() {
  const value = code.value.trim().toUpperCase()
  if (value.length < 5) {
    error.value = 'De code bestaat uit 5 tekens.'
    return
  }
  navigateTo(`/join/${value}`)
}
</script>

<template>
  <div class="player-card">
    <h1 class="player-title">Doe mee met de quiz</h1>

    <p v-if="closed" class="player-notice mt-4">
      De quiz is gesloten. Bedankt voor het meedoen!
    </p>

    <form class="mt-6" @submit.prevent="join">
      <label for="code" class="player-label">Code</label>
      <p id="code-hint" class="player-hint">Deze staat op het grote scherm.</p>
      <input
        id="code"
        v-model="code"
        aria-describedby="code-hint"
        maxlength="5"
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
        enterkeyhint="go"
        placeholder="ABCDE"
        class="player-input mt-3 text-center text-4xl font-extrabold tracking-[0.3em] uppercase placeholder:text-slate-300"
        :aria-invalid="!!error"
        @input="error = null"
      >
      <p v-if="error" role="alert" class="player-error">{{ error }}</p>
      <button type="submit" class="player-button mt-5">
        Verder
      </button>
    </form>
  </div>
</template>
