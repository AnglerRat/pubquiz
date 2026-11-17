<!-- Layout voor de game master (beheer) -->
<template>
  <div class="min-h-dvh bg-default">
    <header class="border-b border-default">
      <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <NuxtLink to="/host" class="flex items-center gap-2 font-semibold">
          <UIcon name="i-lucide-beer" class="size-5 text-primary" />
          Pubquiz <span class="text-muted font-normal">· Game master</span>
        </NuxtLink>
        <div class="flex items-center gap-1">
          <UButton to="/host" variant="ghost" color="neutral" icon="i-lucide-layout-grid" label="Kamers" />
          <UColorModeButton />
        </div>
      </div>
    </header>
    <main>
      <slot />
    </main>
  </div>
</template>
