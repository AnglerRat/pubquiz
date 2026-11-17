<script setup>
/**
 * Media bij een vraag: afbeeldingen in een raster, video's en audio daaronder.
 * Gebruik: <QuestionMedia :media="question.media" />
 */
const props = defineProps({
  /** @type {import('vue').PropType<import('#shared/types').QuestionMedia[]>} */
  media: { type: Array, required: true },
})

const images = computed(() => props.media.filter(m => m.kind === 'image'))
const players = computed(() => props.media.filter(m => m.kind === 'video' || m.kind === 'audio'))

// Raster afhankelijk van het aantal afbeeldingen
const gridClass = computed(() => ({
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
}[images.value.length] ?? 'grid-cols-2 lg:grid-cols-3'))

const imageHeight = computed(() => (images.value.length === 1 ? 'max-h-[50vh]' : 'max-h-[36vh]'))
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-if="images.length" class="grid gap-4" :class="gridClass">
      <figure
        v-for="(image, i) in images"
        :key="image.id"
        class="flex flex-col items-center gap-2 rounded-2xl bg-elevated p-3"
      >
        <div class="relative flex w-full items-center justify-center">
          <span
            v-if="images.length > 1"
            class="absolute top-1 left-1 flex size-8 items-center justify-center rounded-full bg-inverted text-sm font-bold text-inverted"
          >{{ i + 1 }}</span>
          <img
            :src="image.url"
            :alt="image.caption ?? `Afbeelding ${i + 1}`"
            class="w-full rounded-xl object-contain"
            :class="imageHeight"
          >
        </div>
        <figcaption v-if="image.caption" class="text-center text-lg font-medium">
          {{ image.caption }}
        </figcaption>
      </figure>
    </div>

    <QuestionMediaPlayer v-for="item in players" :key="item.id" :item="item" />
  </div>
</template>
