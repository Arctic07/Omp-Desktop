<script setup lang="ts">
import { ref } from 'vue'

interface SourceTerminalBlockProps {
  command: string
  cwd?: string
  output?: string
  status?: 'success' | 'running' | 'error'
  copyLabel?: string
  copiedLabel?: string
  emptyLabel?: string
}

const props = withDefaults(defineProps<SourceTerminalBlockProps>(), {
  cwd: 'Codex',
  output: '',
  status: 'success',
  copyLabel: 'Copy',
  copiedLabel: 'Copied',
  emptyLabel: 'No output',
})

const copied = ref(false)

async function copyTerminal(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined) {
      await navigator.clipboard.writeText([props.command, props.output].filter(Boolean).join('\n'))
    }
    copied.value = true
  } catch {
    copied.value = false
  }
  window.setTimeout(() => {
    copied.value = false
  }, 1600)
}
</script>

<template>
  <section class="dsh-source-terminal" :class="`dsh-source-terminal-${props.status}`" data-terminal>
    <header class="dsh-source-terminal-header">
      <div class="dsh-source-terminal-prompt">
        <div class="dsh-source-terminal-prompt-line">
          <span class="dsh-source-terminal-state" aria-hidden="true" />
          <span class="dsh-source-terminal-cwd">{{ props.cwd }}</span>
          <span class="dsh-source-terminal-command">{{ props.command }}</span>
        </div>
      </div>
      <button v-if="props.status !== 'running' && props.output" class="dsh-source-terminal-copy" type="button" @click="copyTerminal">
        {{ copied ? props.copiedLabel : props.copyLabel }}
      </button>
    </header>
    <pre v-if="props.status !== 'running' && props.output" class="dsh-source-terminal-output"><code>{{ props.output }}</code></pre>
    <div v-else-if="props.status === 'running'" class="dsh-source-terminal-running">{{ props.output }}</div>
    <div v-else class="dsh-source-terminal-empty">{{ props.emptyLabel }}</div>
  </section>
</template>

<style scoped>
.dsh-source-terminal {
  --dsh-source-terminal-radius: 12px;
  --dsh-source-terminal-gutter: 30px;
  position: relative;
  margin: 4px 0;
  padding-left: var(--dsh-source-terminal-gutter);
  overflow: hidden;
  border: 0.5px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06));
  border-radius: var(--dsh-source-terminal-radius);
  background: var(--dsw-alias-markdown-code-block);
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-markdown-code-block);
}

.dsh-source-terminal-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-height: 38px;
  margin-left: calc(-1 * var(--dsh-source-terminal-gutter));
  padding: 9px 14px 9px var(--dsh-source-terminal-gutter);
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
  border-top-left-radius: var(--dsh-source-terminal-radius);
  border-top-right-radius: var(--dsh-source-terminal-radius);
}

.dsh-source-terminal-running .dsh-source-terminal-header {
  border-bottom-color: transparent;
}

.dsh-source-terminal-prompt {
  flex: 1;
  min-width: 0;
}

.dsh-source-terminal-prompt-line {
  position: relative;
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 8px;
  line-height: 19px;
}

.dsh-source-terminal-state {
  position: absolute;
  top: 50%;
  left: calc(-1 * var(--dsh-source-terminal-gutter) + 8px);
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--dsw-alias-state-success-primary);
  transform: translateY(-50%);
}

.dsh-source-terminal-running .dsh-source-terminal-state {
  background: var(--dsw-alias-state-warn-primary);
  animation: dsh-source-terminal-pulse 1.4s ease-in-out infinite alternate;
}

.dsh-source-terminal-error .dsh-source-terminal-state {
  background: var(--dsw-alias-state-error-primary);
}

.dsh-source-terminal-cwd {
  flex: none;
  color: var(--dsw-alias-label-tertiary);
}

.dsh-source-terminal-command {
  min-width: 0;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  text-overflow: ellipsis;
  white-space: pre;
}

.dsh-source-terminal-copy {
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

.dsh-source-terminal-copy:hover {
  color: var(--dsw-alias-label-primary);
}

.dsh-source-terminal-output {
  box-sizing: border-box;
  max-height: 224px;
  margin: 0;
  padding: 12px 14px 12px 0;
  overflow: auto;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  white-space: pre;
}

.dsh-source-terminal-output code {
  font: inherit;
}

.dsh-source-terminal-error .dsh-source-terminal-output {
  color: var(--dsw-alias-state-error-primary);
}

.dsh-source-terminal-running {
  padding: 12px 14px 12px 0;
  color: var(--dsw-alias-label-tertiary);
}

.dsh-source-terminal-empty {
  padding: 12px 14px 12px 0;
  color: var(--dsw-alias-label-tertiary);
}

@keyframes dsh-source-terminal-pulse {
  from { opacity: 0.35; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .dsh-source-terminal-running .dsh-source-terminal-state {
    animation: none;
  }
}
</style>
