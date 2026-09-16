<script setup lang="ts">
import { computed } from 'vue'

import Composer from './Composer.vue'
import SessionPane from './SessionPane.vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const messages = store.messages

const hasTranscript = computed(() =>
  messages.value.some((message) => message.content.trim().length > 0),
)
</script>

<template>
  <section class="chat-surface" aria-label="聊天工作区">

    <div v-if="!hasTranscript" class="home-main-content" data-testid="home-empty">
      <div class="home-scroll">
        <SessionPane />
      </div>
      <div class="home-composer-wrap">
        <Composer variant="home" />
      </div>
    </div>

    <template v-else>
      <SessionPane />
      <Composer variant="docked" />
    </template>
  </section>
</template>
