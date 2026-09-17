<script setup lang="ts">
import type { SourceSettingsAboutCopy } from '../../i18n'
import { AppIcon } from '../icons'

const props = defineProps<{
  copy: SourceSettingsAboutCopy
}>()
</script>

<template>
  <div class="omp-settings-stack">
    <section class="omp-settings-group" :aria-labelledby="'omp-settings-about-build'">
      <div class="omp-settings-group-heading">
        <h3 id="omp-settings-about-build">{{ props.copy.title }}</h3>
        <p>{{ props.copy.description }}</p>
      </div>
      <div class="omp-settings-card">
        <div class="omp-settings-row">
          <div class="omp-settings-row-copy omp-settings-row-copy-with-icon">
            <span class="omp-settings-row-icon" aria-hidden="true"><AppIcon name="info" :size="16" /></span>
            <span>
              <strong>{{ props.copy.versionTitle }}</strong>
              <span>{{ props.copy.versionValue }}</span>
            </span>
          </div>
          <span class="omp-settings-value">{{ props.copy.versionValue }}</span>
        </div>
        <div class="omp-settings-row">
          <div class="omp-settings-row-copy omp-settings-row-copy-with-icon">
            <span class="omp-settings-row-icon" aria-hidden="true"><AppIcon name="terminal" :size="16" /></span>
            <span>
              <strong>{{ props.copy.buildTitle }}</strong>
              <span>{{ props.copy.buildValue }}</span>
            </span>
          </div>
          <span class="omp-settings-value">{{ props.copy.buildValue }}</span>
        </div>
      </div>
    </section>

    <section class="omp-settings-group" :aria-labelledby="'omp-settings-about-resources'">
      <div class="omp-settings-group-heading">
        <h3 id="omp-settings-about-resources">{{ props.copy.linksTitle }}</h3>
        <p>{{ props.copy.linksDescription }}</p>
      </div>
      <div class="omp-settings-card omp-settings-list-card">
        <a
          v-for="resource in props.copy.resources"
          :key="resource.id"
          class="omp-settings-resource"
          :href="resource.href"
          target="_blank"
          rel="noreferrer"
        >
          <span class="omp-settings-row-copy">
            <strong>{{ resource.label }}</strong>
            <span>{{ props.copy.linksDescription }}</span>
          </span>
          <AppIcon name="external-link" :size="16" />
        </a>
      </div>
    </section>

    <section class="omp-settings-group" :aria-labelledby="'omp-settings-about-status'">
      <div class="omp-settings-group-heading">
        <h3 id="omp-settings-about-status">{{ props.copy.statusTitle }}</h3>
        <p>{{ props.copy.statusDescription }}</p>
      </div>
      <div class="omp-settings-card">
        <div class="omp-settings-row">
          <div class="omp-settings-row-copy omp-settings-row-copy-with-icon">
            <span class="omp-settings-row-icon omp-settings-status-icon" aria-hidden="true"><AppIcon name="circle-check" :size="16" /></span>
            <span>
              <strong>{{ props.copy.localOnly }}</strong>
              <span>{{ props.copy.statusDescription }}</span>
            </span>
          </div>
          <span class="omp-settings-status omp-settings-status-active">{{ props.copy.localOnly }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
