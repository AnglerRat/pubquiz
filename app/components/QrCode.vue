<script setup>
import QRCode from 'qrcode'

const props = defineProps({
  value: { type: String, required: true },
})
const svg = ref('')

watch(
  () => props.value,
  async (value) => {
    svg.value = await QRCode.toString(value, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#18181b', light: '#ffffff' },
    })
  },
  { immediate: true },
)
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="qr [&>svg]:block [&>svg]:size-full" v-html="svg" />
</template>
