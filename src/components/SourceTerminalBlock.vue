<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

import { copyText } from '../utils/clipboard'

interface SourceTerminalBlockProps {
  command: string
  cwd?: string
  output?: string
  status?: 'success' | 'running' | 'error'
  copyLabel?: string
  copiedLabel?: string
  copyFailedLabel?: string
  emptyLabel?: string
}

const props = withDefaults(defineProps<SourceTerminalBlockProps>(), {
  cwd: 'Codex',
  output: '',
  status: 'success',
  copyLabel: 'Copy',
  copiedLabel: 'Copied',
  copyFailedLabel: 'Copy failed',
  emptyLabel: 'No output',
})

const copied = ref(false)
const copyError = ref(false)
let copyTimer: number | null = null

function clearCopyTimer(): void {
  if (copyTimer === null) {
    return
  }
  window.clearTimeout(copyTimer)
  copyTimer = null
}

async function copyTerminal(): Promise<void> {
  clearCopyTimer()
  copied.value = false
  copyError.value = false
  const value = [props.command, props.output].filter(Boolean).join('\n')
  if (!(await copyText(value))) {
    copyError.value = true
    return
  }

  copied.value = true
  copyTimer = window.setTimeout(() => {
    copied.value = false
    copyTimer = null
  }, 1600)
}

onUnmounted(() => {
  clearCopyTimer()
})
</script>

<template>
  <section class="omp-source-terminal" :class="`omp-source-terminal-${props.status}`" data-terminal>
    <header class="omp-source-terminal-header">
      <div class="omp-source-terminal-prompt">
        <div class="omp-source-terminal-prompt-line">
          <span class="omp-source-terminal-state" aria-hidden="true" />
          <span class="omp-source-terminal-cwd">{{ props.cwd }}</span>
          <span class="omp-source-terminal-command">{{ props.command }}</span>
        </div>
      </div>
      <button
        v-if="props.status !== 'running' && props.output"
        class="omp-source-terminal-copy"
        type="button"
        :aria-label="copied ? props.copiedLabel : props.copyLabel"
        @click="copyTerminal"
      >
        {{ copied ? props.copiedLabel : props.copyLabel }}
      </button>
    </header>
    <pre v-if="props.status !== 'running' && props.output" class="omp-source-terminal-output"><code>{{ props.output }}</code></pre>
    <div v-else-if="props.status === 'running'" class="omp-source-terminal-running">{{ props.output }}</div>
    <div v-else class="omp-source-terminal-empty">{{ props.emptyLabel }}</div>
    <p v-if="copyError" class="omp-source-terminal-copy-error" role="alert">{{ props.copyFailedLabel }}</p>
  </section>
</template>

<style scoped>
.omp-source-terminal {
  --omp-source-terminal-radius: 12px;
  --omp-source-terminal-gutter: 30px;
  position: relative;
  margin: 4px 0;
  padding-left: var(--omp-source-terminal-gutter);
  overflow: hidden;
  border: 0.5px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06));
  border-radius: var(--omp-source-terminal-radius);
  background: var(--dsw-alias-markdown-code-block);
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-markdown-code-block);
}

.omp-source-terminal-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-height: 38px;
  margin-left: calc(-1 * var(--omp-source-terminal-gutter));
  padding: 9px 14px 9px var(--omp-source-terminal-gutter);
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
  border-top-left-radius: var(--omp-source-terminal-radius);
  border-top-right-radius: var(--omp-source-terminal-radius);
}

.omp-source-terminal-running .omp-source-terminal-header {
  border-bottom-color: transparent;
}

.omp-source-terminal-prompt {
  flex: 1;
  min-width: 0;
}

.omp-source-terminal-prompt-line {
  position: relative;
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 8px;
  line-height: 19px;
}

.omp-source-terminal-state {
  position: absolute;
  top: 50%;
  left: calc(-1 * var(--omp-source-terminal-gutter) + 8px);
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--dsw-alias-state-success-primary);
  transform: translateY(-50%);
}

.omp-source-terminal-running .omp-source-terminal-state {
  background: var(--dsw-alias-state-warn-primary);
  animation: omp-source-terminal-pulse 1.4s ease-in-out infinite alternate;
}

.omp-source-terminal-error .omp-source-terminal-state {
  background: var(--dsw-alias-state-error-primary);
}

.omp-source-terminal-cwd {
  flex: none;
  color: var(--dsw-alias-label-tertiary);
}

.omp-source-terminal-command {
  min-width: 0;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  text-overflow: ellipsis;
  white-space: pre;
}

.omp-source-terminal-copy {
  position: sticky;
  top: 0;
  flex: none;
  padding: 0;
  border: 0;
  background: var(--dsw-alias-markdown-code-block);
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  line-height: 19px;
  cursor: pointer;
}

.omp-source-terminal-copy:hover {
  color: var(--dsw-alias-label-primary);
}

.omp-source-terminal-output {
  box-sizing: border-box;
  max-height: 224px;
  margin: 0;
  padding: 12px 14px 12px 0;
  overflow: auto;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  white-space: pre;
}

.omp-source-terminal-output code {
  font: inherit;
}

.omp-source-terminal-error .omp-source-terminal-output {
  color: var(--dsw-alias-state-error-primary);
}

.omp-source-terminal-running {
  padding: 12px 14px 12px 0;
  color: var(--dsw-alias-label-tertiary);
}

.omp-source-terminal-empty {
  padding: 12px 14px 12px 0;
  color: var(--dsw-alias-label-tertiary);
}

@keyframes omp-source-terminal-pulse {
  from { opacity: 0.35; }
  to { opacity: 1; }
}

.omp-source-terminal-copy-error {
  margin: 0;
  padding: 6px 14px 9px 0;
  color: var(--dsw-alias-state-error-primary);
  font: 11px/16px var(--omp-font-family);
}

@media (prefers-reduced-motion: reduce) {
  .omp-source-terminal-running .omp-source-terminal-state {
    animation: none;
  }
}
</style>
