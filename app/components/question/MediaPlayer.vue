<script setup>
/**
 * Video of audio afspelen, met respect voor het fragment (startSeconds / endSeconds).
 * YouTube-links worden als embed getoond (met start/eind via de embed-parameters).
 */
const props = defineProps({
  /** @type {import('vue').PropType<import('#shared/types').QuestionMedia>} */
  item: { type: Object, required: true },
})

const el = ref()
const start = computed(() => props.item.startSeconds ?? 0)
const end = computed(() => props.item.endSeconds ?? null)
const hasFragment = computed(() => props.item.startSeconds != null || props.item.endSeconds != null)

const youtubeId = computed(() => {
  if (props.item.kind !== 'video') return null
  const match = props.item.url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return match?.[1] ?? null
})

const youtubeSrc = computed(() => {
  const params = new URLSearchParams({ rel: '0', modestbranding: '1' })
  if (props.item.startSeconds != null) params.set('start', String(props.item.startSeconds))
  if (props.item.endSeconds != null) params.set('end', String(props.item.endSeconds))
  return `https://www.youtube-nocookie.com/embed/${youtubeId.value}?${params}`
})

function toStart() {
  if (el.value) el.value.currentTime = start.value
}

function onTimeUpdate() {
  if (end.value != null && el.value.currentTime >= end.value) el.value.pause()
}

function onPlay() {
  // Opnieuw op "play" na het einde van het fragment (of ervoor): terug naar het begin van het fragment
  const t = el.value.currentTime
  if (t < start.value || (end.value != null && t >= end.value - 0.1)) toStart()
}

function replay() {
  toStart()
  el.value?.play()
}

function formatTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
</script>

<template>
  <figure class="flex flex-col gap-2">
    <!-- YouTube -->
    <div v-if="youtubeId" class="aspect-video w-full overflow-hidden rounded-2xl bg-black">
      <iframe
        :src="youtubeSrc"
        class="size-full"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowfullscreen
        title="Video bij de vraag"
      />
    </div>

    <!-- Eigen videobestand -->
    <video
      v-else-if="item.kind === 'video'"
      ref="el"
      :src="item.url"
      controls
      playsinline
      preload="metadata"
      class="max-h-[60vh] w-full rounded-2xl bg-black"
      @loadedmetadata="toStart"
      @timeupdate="onTimeUpdate"
      @play="onPlay"
    />

    <!-- Audio -->
    <div v-else class="flex items-center gap-4 rounded-2xl bg-elevated p-4">
      <UIcon name="i-lucide-music" class="size-8 shrink-0 text-primary" />
      <audio
        ref="el"
        :src="item.url"
        controls
        preload="metadata"
        class="w-full"
        @loadedmetadata="toStart"
        @timeupdate="onTimeUpdate"
        @play="onPlay"
      />
    </div>

    <figcaption class="flex flex-wrap items-center justify-between gap-2 text-muted">
      <span>{{ item.caption }}</span>
      <span v-if="hasFragment && !youtubeId" class="flex items-center gap-2">
        <span class="text-sm">Fragment {{ formatTime(start) }}<template v-if="end != null"> – {{ formatTime(end) }}</template></span>
        <UButton size="sm" variant="soft" icon="i-lucide-rotate-ccw" label="Opnieuw" @click="replay" />
      </span>
    </figcaption>
  </figure>
</template>
