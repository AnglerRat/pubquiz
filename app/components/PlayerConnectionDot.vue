<script setup>
defineProps({
  /** 'connecting' | 'open' | 'closed' */
  status: { type: String, required: true },
})
</script>

<template>
  <!-- Alleen zichtbaar als er iets mis is met de verbinding -->
  <div
    v-if="status !== 'open'"
    role="status"
    class="fixed inset-x-0 top-0 z-50 bg-amber-300 px-4 py-2 text-center text-base font-medium text-stone-900"
  >
    {{ status === 'connecting' ? 'Verbinden…' : 'Geen verbinding. We proberen het opnieuw.' }}
  </div>
</template>
