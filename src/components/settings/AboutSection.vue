<script setup lang="ts">
import type { SourceSettingsAboutCopy } from '../../i18n'
import { AppIcon } from '../icons'

const props = defineProps<{
  copy: SourceSettingsAboutCopy
}>()
</script>

<template>
  <div class="dsh-settings-stack">
    <section class="dsh-settings-group" :aria-labelledby="'dsh-settings-about-build'">
      <div class="dsh-settings-group-heading">
        <h3 id="dsh-settings-about-build">{{ props.copy.title }}</h3>
        <p>{{ props.copy.description }}</p>
      </div>
      <div class="dsh-settings-card">
        <div class="dsh-settings-row">
          <div class="dsh-settings-row-copy dsh-settings-row-copy-with-icon">
            <span class="dsh-settings-row-icon" aria-hidden="true"><AppIcon name="info" :size="16" /></span>
            <span>
              <strong>{{ props.copy.versionTitle }}</strong>
              <span>{{ props.copy.versionValue }}</span>
            </span>
          </div>
          <span class="dsh-settings-value">{{ props.copy.versionValue }}</span>
        </div>
        <div class="dsh-settings-row">
          <div class="dsh-settings-row-copy dsh-settings-row-copy-with-icon">
            <span class="dsh-settings-row-icon" aria-hidden="true"><AppIcon name="terminal" :size="16" /></span>
            <span>
              <strong>{{ props.copy.buildTitle }}</strong>
              <span>{{ props.copy.buildValue }}</span>
            </span>
          </div>
          <span class="dsh-settings-value">{{ props.copy.buildValue }}</span>
        </div>
      </div>
    </section>

    <section class="dsh-settings-group" :aria-labelledby="'dsh-settings-about-resources'">
      <div class="dsh-settings-group-heading">
        <h3 id="dsh-settings-about-resources">{{ props.copy.linksTitle }}</h3>
        <p>{{ props.copy.linksDescription }}</p>
      </div>
      <div class="dsh-settings-card dsh-settings-list-card">
        <a
          v-for="resource in props.copy.resources"
          :key="resource.id"
          class="dsh-settings-resource"
          :href="resource.href"
          target="_blank"
          rel="noreferrer"
        >
          <span class="dsh-settings-row-copy">
            <strong>{{ resource.label }}</strong>
            <span>{{ props.copy.linksDescription }}</span>
          </span>
          <AppIcon name="external-link" :size="16" />
        </a>
      </div>
    </section>

    <section class="dsh-settings-group" :aria-labelledby="'dsh-settings-about-status'">
      <div class="dsh-settings-group-heading">
        <h3 id="dsh-settings-about-status">{{ props.copy.statusTitle }}</h3>
        <p>{{ props.copy.statusDescription }}</p>
      </div>
      <div class="dsh-settings-card">
        <div class="dsh-settings-row">
          <div class="dsh-settings-row-copy dsh-settings-row-copy-with-icon">
            <span class="dsh-settings-row-icon dsh-settings-status-icon" aria-hidden="true"><AppIcon name="circle-check" :size="16" /></span>
            <span>
              <strong>{{ props.copy.localOnly }}</strong>
              <span>{{ props.copy.statusDescription }}</span>
            </span>
          </div>
          <span class="dsh-settings-status dsh-settings-status-active">{{ props.copy.localOnly }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
