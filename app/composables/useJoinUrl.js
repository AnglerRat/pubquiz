/**
 * Bepaalt de URL die in de QR-code komt.
 * - NUXT_PUBLIC_JOIN_BASE_URL heeft voorrang (handmatig instellen)
 * - kijkt de game master via localhost, dan gebruiken we het LAN-IP van de server,
 *   zodat telefoons op hetzelfde netwerk de link kunnen openen
 * - anders: de huidige origin
 */
export function useJoinUrl(code) {
  const config = useRuntimeConfig()
  const addresses = ref([])
  const selectedAddress = ref()

  const isLocalhost = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname)

  const baseUrl = computed(() => {
    const configured = String(config.public.joinBaseUrl || '').replace(/\/$/, '')
    if (configured) return configured
    if (isLocalhost && selectedAddress.value) {
      return `${location.protocol}//${selectedAddress.value}${location.port ? `:${location.port}` : ''}`
    }
    return location.origin
  })

  const joinUrl = computed(() => `${baseUrl.value}/join/${code}`)

  onMounted(async () => {
    if (config.public.joinBaseUrl || !isLocalhost) return
    try {
      const res = await $fetch('/api/network')
      addresses.value = res.addresses
      selectedAddress.value = res.addresses[0]
    }
    catch {
      // geen LAN-adres gevonden → origin
    }
  })

  return { joinUrl, baseUrl, addresses, selectedAddress, isLocalhost }
}
