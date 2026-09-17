<script setup lang="ts">
import type { ReviewSection, ReviewSectionView } from '../composables/useWorkspaceReviewPanel'
import { useAppSettings } from '../stores/appSettings'
import type { ReviewFile, ReviewHunk } from '../utils/desktopApi'
import { AppIcon } from './icons'

const props = defineProps<{
  sections: readonly ReviewSectionView[]
  changedLabel: string
  totalAdditions: number
  totalDeletions: number
  truncated: boolean
  gitOperationBusy: boolean
  isSectionExpanded: (section: ReviewSection) => boolean
  isActionActive: (key: string) => boolean
  isFileExpanded: (section: ReviewSection, file: ReviewFile) => boolean
}>()

const emit = defineEmits<{
  'toggle-section': [section: ReviewSection]
  'section-action': [section: ReviewSection]
  'toggle-file': [section: ReviewSection, file: ReviewFile]
  'open-file': [section: ReviewSection, file: ReviewFile]
  'file-action': [section: ReviewSection, file: ReviewFile]
}>()

const { copy } = useAppSettings()
const statusLetters: Record<ReviewFile['status'], string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
  untracked: 'U',
}

function sectionActionKey(section: ReviewSection): string {
  return `${section}:all`
}

function fileKey(section: ReviewSection, file: ReviewFile): string {
  return `${section}:${file.status}:${file.path}:${file.oldPath ?? ''}`
}

function fileActionKey(section: ReviewSection, file: ReviewFile): string {
  return `${section}:${fileKey(section, file)}`
}

function fileDetailsId(section: ReviewSection, index: number): string {
  return `omp-source-review-${section}-details-${index}`
}

function hunkKey(section: ReviewSection, file: ReviewFile, hunk: ReviewHunk, index: number): string {
  return `${fileKey(section, file)}:${index}:${hunk.header}`
}

function linePrefix(type: ReviewHunk['lines'][number]['type']): string {
  if (type === 'add') {
    return '+'
  }
  if (type === 'del') {
    return '-'
  }
  return ' '
}

function fileToggleLabel(section: ReviewSection, file: ReviewFile): string {
  const label = props.isFileExpanded(section, file) ? copy.reviewCollapseFile : copy.reviewExpandFile
  return `${label}: ${file.path}`
}

function fileOpenLabel(file: ReviewFile): string {
  return `${copy.reviewDiffOpenFile}: ${file.path} (${statusLetters[file.status]})`
}
</script>

<template>
  <div class="omp-source-review-sections">
    <p v-if="props.truncated" class="omp-source-review-truncated" role="note">{{ copy.reviewTruncated }}</p>
    <div class="omp-source-review-total" role="status" aria-live="polite">
      <span>{{ props.changedLabel }}</span>
      <span class="omp-source-review-total-stats">
        <span class="omp-source-review-additions">+{{ props.totalAdditions }}</span>
        <span class="omp-source-review-deletions">−{{ props.totalDeletions }}</span>
      </span>
    </div>
    <section v-for="section in props.sections" :key="section.id" class="omp-source-review-section">
      <header class="omp-source-review-section-header">
        <button
          class="omp-source-review-section-toggle"
          type="button"
          :aria-expanded="props.isSectionExpanded(section.id)"
          :aria-controls="`omp-source-review-${section.id}-files`"
          @click="emit('toggle-section', section.id)"
        >
          <AppIcon
            name="chevron-right"
            class="omp-source-review-chevron"
            :class="{ 'omp-source-review-chevron-open': props.isSectionExpanded(section.id) }"
            :size="13"
            aria-hidden="true"
          />
          <strong>{{ section.label }}</strong>
          <span class="omp-source-review-section-count">{{ section.files.length }}</span>
          <span class="omp-source-review-section-stats">
            <span class="omp-source-review-additions">+{{ section.additions }}</span>
            <span class="omp-source-review-deletions">−{{ section.deletions }}</span>
          </span>
        </button>
        <button
          class="omp-source-review-section-action"
          type="button"
          :aria-label="section.actionLabel"
          :title="section.actionLabel"
          :disabled="section.files.length === 0 || props.gitOperationBusy"
          @click="emit('section-action', section.id)"
        >
          <AppIcon
            :name="props.isActionActive(sectionActionKey(section.id)) ? 'refresh-cw' : section.actionIcon"
            :class="{ 'omp-source-review-spin': props.isActionActive(sectionActionKey(section.id)) }"
            :size="14"
            aria-hidden="true"
          />
        </button>
      </header>
      <div
        v-if="props.isSectionExpanded(section.id)"
        :id="`omp-source-review-${section.id}-files`"
        class="omp-source-review-files"
        role="list"
      >
        <article v-for="(file, index) in section.files" :key="fileKey(section.id, file)" class="omp-source-review-file" role="listitem">
          <header class="omp-source-review-file-header">
            <button
              class="omp-source-review-expand"
              type="button"
              :aria-expanded="props.isFileExpanded(section.id, file)"
              :aria-controls="fileDetailsId(section.id, index)"
              :aria-label="fileToggleLabel(section.id, file)"
              :title="fileToggleLabel(section.id, file)"
              @click="emit('toggle-file', section.id, file)"
            >
              <AppIcon
                name="chevron-right"
                class="omp-source-review-chevron"
                :class="{ 'omp-source-review-chevron-open': props.isFileExpanded(section.id, file) }"
                :size="12"
                aria-hidden="true"
              />
            </button>
            <button class="omp-source-review-file-path" type="button" :aria-label="fileOpenLabel(file)" :title="fileOpenLabel(file)" @click="emit('open-file', section.id, file)">
              <span class="omp-source-review-status" :class="`omp-source-review-status-${file.status}`" aria-hidden="true">{{ statusLetters[file.status] }}</span>
              <span class="omp-source-review-path-copy">
                <span v-if="file.oldPath" class="omp-source-review-old-path">{{ file.oldPath }} →</span>
                <span class="omp-source-review-path">{{ file.path }}</span>
              </span>
            </button>
            <span class="omp-source-review-counts" :aria-label="`${copy.reviewDiffStats}: +${file.additions}, -${file.deletions}`">
              <span class="omp-source-review-additions">+{{ file.additions }}</span>
              <span class="omp-source-review-deletions">−{{ file.deletions }}</span>
            </span>
            <button
              class="omp-source-review-file-action"
              type="button"
              :aria-label="section.id === 'staged' ? copy.reviewUnstage : copy.reviewStage"
              :title="section.id === 'staged' ? copy.reviewUnstage : copy.reviewStage"
              :disabled="props.gitOperationBusy"
              @click.stop="emit('file-action', section.id, file)"
            >
              <AppIcon
                :name="props.isActionActive(fileActionKey(section.id, file)) ? 'refresh-cw' : section.actionIcon"
                :class="{ 'omp-source-review-spin': props.isActionActive(fileActionKey(section.id, file)) }"
                :size="13"
                aria-hidden="true"
              />
            </button>
          </header>
          <div v-if="props.isFileExpanded(section.id, file)" :id="fileDetailsId(section.id, index)" class="omp-source-review-file-details">
            <p v-if="file.binary" class="omp-source-review-file-message">{{ copy.reviewBinary }}</p>
            <p v-else-if="file.tooLarge" class="omp-source-review-file-message">{{ copy.reviewTooLarge }}</p>
            <template v-else-if="file.hunks.length > 0">
              <section v-for="(hunk, hunkIndex) in file.hunks" :key="hunkKey(section.id, file, hunk, hunkIndex)" class="omp-source-review-hunk">
                <h3 class="omp-source-review-hunk-header">{{ hunk.header }}</h3>
                <div class="omp-source-review-lines" role="list">
                  <div v-for="(line, lineIndex) in hunk.lines" :key="`${hunkKey(section.id, file, hunk, hunkIndex)}:${lineIndex}`" class="omp-source-review-line" :class="`omp-source-review-line-${line.type}`" role="listitem">
                    <span class="omp-source-review-line-marker" aria-hidden="true">{{ linePrefix(line.type) }}</span>
                    <code>{{ line.text }}</code>
                  </div>
                </div>
              </section>
            </template>
            <p v-else class="omp-source-review-file-message">{{ copy.reviewNoLineDetails }}</p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
