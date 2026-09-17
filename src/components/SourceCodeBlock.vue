<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { getSingletonHighlighter, type BundledLanguage } from 'shiki'

import { useAppSettings } from '../stores/appSettings'

interface SourceCodeBlockProps {
  code: string
  language?: string
  copyLabel?: string
  copiedLabel?: string
}

const props = withDefaults(defineProps<SourceCodeBlockProps>(), {
  language: 'text',
  copyLabel: 'Copy',
  copiedLabel: 'Copied',
})

const { settings } = useAppSettings()
const copied = ref(false)
const highlightedCode = ref('')
let renderRequest = 0

const languageAliases: Record<string, BundledLanguage> = {
  bash: 'bash',
  javascript: 'javascript',
  js: 'javascript',
  json: 'json',
  powershell: 'powershell',
  pwsh: 'powershell',
  sh: 'bash',
  shell: 'bash',
  ts: 'typescript',
  typescript: 'typescript',
}

const resolvedLanguage = computed<BundledLanguage | null>(() => {
  const normalized = props.language.trim().toLowerCase()
  return languageAliases[normalized] ?? null
})

const themeName = computed(() => {
  if (typeof document === 'undefined') return 'github-dark'
  return document.body.hasAttribute('data-ds-dark-theme') ? 'github-dark' : 'github-light'
})

async function renderCode(): Promise<void> {
  const request = ++renderRequest
  highlightedCode.value = ''
  if (resolvedLanguage.value === null) return
  try {
    const highlighter = await getSingletonHighlighter({
      langs: ['json', 'typescript', 'javascript', 'bash', 'powershell'],
      themes: ['github-dark', 'github-light'],
    })
    if (request !== renderRequest) return
    highlightedCode.value = highlighter.codeToHtml(props.code, {
      lang: resolvedLanguage.value,
      theme: themeName.value,
    })
  } catch {
    if (request === renderRequest) highlightedCode.value = ''
  }
}

async function copyCode(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined) {
      await navigator.clipboard.writeText(props.code)
    }
    copied.value = true
  } catch {
    copied.value = false
  }
  window.setTimeout(() => {
    copied.value = false
  }, 1600)
}

watch(
  [() => props.code, () => props.language, () => settings.theme],
  () => { void renderCode() },
  { immediate: true },
)
</script>

<template>
  <article class="omp-source-code-block" data-code-block :data-language="props.language">
    <header class="omp-source-code-block-banner">
      <span>{{ props.language }}</span>
      <button type="button" @click="copyCode">{{ copied ? props.copiedLabel : props.copyLabel }}</button>
    </header>
    <div class="omp-source-code-block-body">
      <div v-if="highlightedCode" class="omp-source-code-block-highlighted" v-html="highlightedCode" />
      <pre v-else><code>{{ props.code }}</code></pre>
    </div>
  </article>
</template>

<style scoped>
.omp-source-code-block {
  margin: 4px 0;
  overflow: hidden;
  border: 0.5px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06));
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
</style>
