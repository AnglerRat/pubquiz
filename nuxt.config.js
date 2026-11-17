// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: false },

  // De app draait als SPA: sessies (host-/spelertokens) staan in localStorage.
  // De back-end (API + websockets) draait gewoon op de Nitro-server.
  ssr: false,

  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],

  // Luister op alle netwerkinterfaces, zodat telefoons op hetzelfde (wifi)netwerk kunnen joinen.
  devServer: { host: '0.0.0.0', port: 3000 },

  nitro: {
    experimental: { websocket: true },
  },

  runtimeConfig: {
    // Overschrijfbaar via NUXT_DB_HOST, NUXT_DB_PORT, NUXT_DB_USER, NUXT_DB_PASSWORD, NUXT_DB_DATABASE
    db: {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'pubquiz',
    },
    public: {
      // Optioneel: vaste URL voor de QR-code (NUXT_PUBLIC_JOIN_BASE_URL), bijv. http://192.168.1.20:3000
      joinBaseUrl: '',
    },
  },

  app: {
    head: {
      title: 'Pubquiz',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#1739b8' },
      ],
    },
  },

  // Lettertype voor de spelersschermen (wordt lokaal gebundeld, werkt ook zonder internet op locatie)
  fonts: {
    families: [{ name: 'Rubik', provider: 'google', weights: [400, 500, 700, 800, 900] }],
  },
})
