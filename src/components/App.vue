<script setup lang="ts">
import type { SourceResult } from '../data/types'
import { computed } from 'vue'
import SourceSection from './SourceSection.vue'

const props = defineProps<{
  sections: SourceResult[]
  dateLabel: string
}>()

const nonEmptySections = computed(() => props.sections.filter(s => s.items.length > 0))
const hasAnyItems = computed(() => nonEmptySections.value.length > 0)
const failedCount = computed(() => props.sections.filter(s => s.error).length)

const footerText = computed(() => {
  const suffix = failedCount.value ? ` · ${failedCount.value} source(s) unavailable today` : ''
  return `Aggregated from ${props.sections.length} RSS sources${suffix}.`
})
</script>

<template>
  <div class="wrap">
    <header>
      <span class="eyebrow">Wire Digest</span>
      <h1>Daily AI Digest</h1>
      <div class="subtitle">
        {{ dateLabel }}
      </div>
    </header>
    <template v-if="hasAnyItems">
      <SourceSection v-for="section in nonEmptySections" :key="section.name" :section="section" />
    </template>
    <p v-else class="empty-state">
      No articles could be fetched today.
    </p>
    <footer>
      {{ footerText }}
    </footer>
  </div>
</template>
