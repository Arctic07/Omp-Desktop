<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

import { useAppSettings } from '../stores/appSettings'
import { copyText } from '../utils/clipboard'
import {
  highlightSourceCode,
  resolveSourceSyntaxLanguage,
  type SourceHighlightedToken,
  type SourceSyntaxTheme,
} from '../utils/sourceSyntaxHighlighter'

interface SourceCodeBlockProps {
  code: string
  language?: string
  copyLabel?: string
  copiedLabel?: string
  copyFailedLabel?: string
}

const props = withDefaults(defineProps<SourceCodeBlockProps>(), {
  language: 'text',
  copyLabel: 'Copy',
  copiedLabel: 'Copied',
  copyFailedLabel: 'Copy failed',
})

const { settings } = useAppSettings()
const copied = ref(false)
const copyError = ref(false)
const highlightedLines = ref<readonly (readonly SourceHighlightedToken[])[]>([])
let renderRequest = 0
let copyTimer: number | null = null

const resolvedLanguage = computed(() => resolveSourceSyntaxLanguage(props.language))
const themeName = computed<SourceSyntaxTheme>(() => {
  if (settings.theme === 'dark') {
    return 'github-dark'
  }
  if (settings.theme === 'light') {
    return 'github-light'
  }
  if (typeof document !== 'undefined' && document.body.hasAttribute('data-ds-dark-theme')) {
    return 'github-dark'
  }
  return 'github-light'
})

async function renderCode(): Promise<void> {
  const request = ++renderRequest
  highlightedLines.value = []
  if (resolvedLanguage.value === null) {
    return
  }

  try {
    const lines = await highlightSourceCode(props.code, resolvedLanguage.value, themeName.value)
    if (request === renderRequest) {
      highlightedLines.value = lines
    }
  } catch {
    if (request === renderRequest) {
      highlightedLines.value = []
    }
  }
}

function clearCopyTimer(): void {
  if (copyTimer === null) {
    return
  }
  window.clearTimeout(copyTimer)
  copyTimer = null
}

async function copyCode(): Promise<void> {
  clearCopyTimer()
  copied.value = false
  copyError.value = false
  if (!(await copyText(props.code))) {
    copyError.value = true
    return
  }

  copied.value = true
  copyTimer = window.setTimeout(() => {
    copied.value = false
    copyTimer = null
  }, 1600)
}

function tokenStyle(token: SourceHighlightedToken): { color?: string } | undefined {
  return token.color === undefined ? undefined : { color: token.color }
}

watch(
  [() => props.code, () => props.language, () => settings.theme],
  () => { void renderCode() },
  { immediate: true },
)

onUnmounted(() => {
  renderRequest += 1
  clearCopyTimer()
})
</script>

<template>
  <article class="omp-source-code-block" data-code-block :data-language="props.language">
    <header class="omp-source-code-block-banner">
      <span>{{ props.language }}</span>
      <button
        type="button"
        :aria-label="copied ? props.copiedLabel : props.copyLabel"
        @click="copyCode"
      >
        {{ copied ? props.copiedLabel : props.copyLabel }}
      </button>
    </header>
    <div class="omp-source-code-block-body">
      <pre v-if="highlightedLines.length > 0"><code><template v-for="(line, lineIndex) in highlightedLines" :key="lineIndex"><span class="omp-source-code-block-line"><span v-for="(token, tokenIndex) in line" :key="`${lineIndex}-${tokenIndex}`" :style="tokenStyle(token)">{{ token.content }}</span></span><template v-if="lineIndex < highlightedLines.length - 1">{{ '\n' }}</template></template></code></pre>
      <pre v-else><code>{{ props.code }}</code></pre>
    </div>
    <p v-if="copyError" class="omp-source-code-block-error" role="alert">{{ props.copyFailedLabel }}</p>
  </article>
</template>

<style scoped>
.omp-source-code-block {
  margin: 4px 0;
  overflow: hidden;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: 12px;
  background: var(--dsw-alias-markdown-code-block);
  color: var(--dsw-alias-label-primary);
}

.omp-source-code-block-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 14px;
  background: var(--dsw-alias-markdown-code-block-banner);
  color: var(--dsw-alias-label-primary);
  font: 11px/18px var(--omp-font-family);
}

.omp-source-code-block-banner span {
  overflow: hidden;
  font-family: var(--ds-font-family-code);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.omp-source-code-block-banner button {
  flex: none;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  cursor: pointer;
}

.omp-source-code-block-banner button:hover {
  color: var(--dsw-alias-label-primary);
}

.omp-source-code-block-body :deep(pre),
.omp-source-code-block-body > pre {
  box-sizing: border-box;
  max-height: 260px;
  margin: 0;
  padding: 16px;
  overflow: auto;
  background: var(--dsw-alias-markdown-code-block) !important;
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-markdown-code-block);
  white-space: pre-wrap;
  word-break: break-word;
}

.omp-source-code-block-body :deep(pre code),
.omp-source-code-block-body > pre code {
  font: inherit;
}

.omp-source-code-block-line {
  display: inline;
}

.omp-source-code-block-error {
  margin: 0;
  padding: 6px 14px 9px;
  color: var(--dsw-alias-state-error-primary);
  font-size: 11px;
  line-height: 16px;
}
</style>
