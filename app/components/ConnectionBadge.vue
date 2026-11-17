<script setup>
const props = defineProps({
  /** 'connecting' | 'open' | 'closed' */
  status: { type: String, required: true },
})

const view = computed(() => ({
  open: { label: 'Live', color: 'success', icon: 'i-lucide-radio' },
  connecting: { label: 'Verbinden…', color: 'warning', icon: 'i-lucide-loader-circle' },
  closed: { label: 'Offline', color: 'error', icon: 'i-lucide-wifi-off' },
}[props.status]))
</script>

<template>
  <UBadge :color="view.color" variant="subtle" :icon="view.icon" :label="view.label" />
</template>
