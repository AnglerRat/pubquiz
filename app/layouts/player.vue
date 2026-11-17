<!--
  Layout voor deelnemers (mobiel): spelshow-podium met logo, inhoud op kaarten.
  Pagina's zetten hun inhoud in een <div class="player-card">.
-->
<template>
  <div class="show-stage min-h-dvh font-show text-lg text-show-ink">
    <header class="px-5 pt-8 pb-7 text-center">
      <span class="show-logo">Pubquiz</span>
    </header>

    <main class="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-10">
      <slot />
    </main>
  </div>
</template>
