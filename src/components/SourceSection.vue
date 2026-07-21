<script setup lang="ts">
import type { SourceResult } from '../data/types'
import { formatDate } from '../utils/format-date'

defineProps<{ section: SourceResult }>()
</script>

<template>
  <section class="source-section">
    <h2 class="source-name">
      {{ section.name }}
    </h2>
    <ul class="item-list">
      <li v-for="item in section.items" :key="item.link" class="item">
        <div class="item-line">
          <a class="item-title" :href="item.link" target="_blank" rel="noopener noreferrer">{{ item.title }}</a>
          <span v-if="item.pubDate" class="item-date">{{ formatDate(item.pubDate) }}</span>
        </div>
        <p v-if="item.description" class="item-desc">
          {{ item.description }}
        </p>
      </li>
    </ul>
  </section>
</template>
