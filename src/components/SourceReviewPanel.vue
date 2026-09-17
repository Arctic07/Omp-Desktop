<script setup lang="ts">
import { toRef } from 'vue'

import { useWorkspaceReviewPanel } from '../composables/useWorkspaceReviewPanel'
import type { ReviewDiffTarget } from '../utils/desktopApi'
import { AppIcon } from './icons'

interface SourceReviewPanelProps {
  workspacePath: string | null
}

defineOptions({ inheritAttrs: false })

const props = defineProps<SourceReviewPanelProps>()
const emit = defineEmits<{
  'open-diff': [target: ReviewDiffTarget]
  'refresh-workspace': []
}>()

const {
  copy,
  review,
  loading,
  reviewFailure,
  actionError,
  reviewSections,
  changedFilesCount,
  changedLabel,
  totalAdditions,
  totalDeletions,
  gitOperationBusy,
  canCommit,
  workspaceLabel,
  pullLoading,
  commitMessage,
  commitLoading,
  operationNotice,
  operationStatus,
  refreshReview,
  pullChanges,
  commitChanges,
  isSectionExpanded,
  toggleSection,
  isActionActive,
  sectionActionKey,
  runSectionAction,
  fileKey,
  fileDetailsId,
  fileActionKey,
  isFileExpanded,
  toggleFile,
  fileToggleLabel,
  fileOpenLabel,
  hunkKey,
  linePrefix,
  statusLetter,
  openFile,
  runFileAction,
} = useWorkspaceReviewPanel(toRef(props, 'workspacePath'), {
  onOpenDiff: (target: ReviewDiffTarget) => emit('open-diff', target),
  onRefreshWorkspace: () => emit('refresh-workspace'),
})
</script>

<template>
  <aside class="omp-source-review-panel" :aria-label="copy.reviewTab">
    <header class="omp-source-review-toolbar">
      <div class="omp-source-review-toolbar-copy">
        <strong>{{ copy.reviewTab }}</strong>
        <span v-if="props.workspacePath !== null" class="omp-source-review-toolbar-repository" :title="props.workspacePath">
          {{ workspaceLabel }}
        </span>
      </div>
      <button
        class="omp-source-review-refresh"
        type="button"
        :aria-label="copy.reviewRefresh"
        :title="copy.reviewRefresh"
        :disabled="props.workspacePath === null || loading || gitOperationBusy"
        @click="refreshReview()"
      >
        <AppIcon name="refresh-cw" :class="{ 'omp-source-review-spin': loading }" :size="15" aria-hidden="true" />
      </button>
    </header>

    <div class="omp-source-review-scroll">
      <div v-if="props.workspacePath === null" class="omp-source-review-state">
        <AppIcon name="git-fork" :size="24" aria-hidden="true" />
        <strong>{{ copy.fileNoWorkspace }}</strong>
        <span>{{ copy.fileNoWorkspaceHint }}</span>
      </div>
      <div v-else-if="loading && review === null" class="omp-source-review-state" role="status" aria-live="polite">
        <AppIcon name="refresh-cw" class="omp-source-review-spin" :size="19" aria-hidden="true" />
        <span>{{ copy.reviewLoading }}</span>
      </div>
      <div v-else-if="reviewFailure" class="omp-source-review-state omp-source-review-state-error" role="alert">
        <AppIcon name="circle-alert" :size="22" aria-hidden="true" />
        <strong>{{ reviewFailure }}</strong>
        <button class="omp-source-review-retry" type="button" :title="copy.reviewRefresh" :disabled="gitOperationBusy" @click="refreshReview()">
          {{ copy.reviewRefresh }}
        </button>
      </div>
      <template v-else-if="review !== null">
        <div v-if="!review.repo" class="omp-source-review-state">
          <AppIcon name="git-fork" :size="24" aria-hidden="true" />
          <strong>{{ copy.reviewNoRepository }}</strong>
        </div>
        <template v-else>
          <div class="omp-source-review-repository-bar">
            <div class="omp-source-review-repository-copy">
              <AppIcon name="git-fork" :size="15" aria-hidden="true" />
              <strong :title="props.workspacePath ?? ''">{{ workspaceLabel }}</strong>
            </div>
            <span class="omp-source-review-repository-status" :class="{ 'omp-source-review-repository-status-clean': review.clean }">
              {{ review.clean ? copy.reviewClean : changedLabel }}
            </span>
            <div class="omp-source-review-repository-actions">
              <button class="omp-source-review-operation-button" type="button" :disabled="gitOperationBusy || review.repo !== true" :aria-label="copy.reviewPull" :title="copy.reviewPull" @click="pullChanges">
                <AppIcon :name="pullLoading ? 'refresh-cw' : 'cloud-download'" :class="{ 'omp-source-review-spin': pullLoading }" :size="13" aria-hidden="true" />
                <span>{{ copy.reviewPull }}</span>
              </button>
            </div>
          </div>
          <div class="omp-source-review-commit">
            <label class="omp-source-review-commit-label" for="omp-source-review-commit-message">{{ copy.reviewCommitMessage }}</label>
            <textarea id="omp-source-review-commit-message" v-model="commitMessage" class="omp-source-review-commit-input" :placeholder="copy.reviewCommitPlaceholder" :disabled="gitOperationBusy" rows="2" @keydown.ctrl.enter.prevent="commitChanges" @keydown.meta.enter.prevent="commitChanges" />
            <button class="omp-source-review-commit-button" type="button" :disabled="!canCommit" :aria-label="copy.reviewCommit" @click="commitChanges">
              <AppIcon :name="commitLoading ? 'refresh-cw' : 'check'" :class="{ 'omp-source-review-spin': commitLoading }" :size="14" aria-hidden="true" />
              <span>{{ commitLoading ? copy.reviewCommitLoading : copy.reviewCommit }}</span>
            </button>
          </div>
          <div v-if="operationNotice" class="omp-source-review-action-success" role="status" aria-live="polite">{{ operationNotice }}</div>
          <div v-if="operationStatus" class="omp-source-review-action-status" role="status" aria-live="polite">
            <AppIcon name="refresh-cw" class="omp-source-review-spin" :size="13" aria-hidden="true" />
            <span>{{ operationStatus }}</span>
          </div>
          <div v-if="actionError" class="omp-source-review-action-error" role="alert">
            <AppIcon name="circle-alert" :size="14" aria-hidden="true" />
            <span>{{ actionError }}</span>
          </div>
          <div v-if="changedFilesCount === 0" class="omp-source-review-state omp-source-review-state-inline">
            <AppIcon name="circle-check" :size="22" aria-hidden="true" />
            <strong>{{ review.clean ? copy.reviewClean : copy.reviewNoChanges }}</strong>
          </div>
          <div v-else class="omp-source-review-sections">
            <p v-if="review.truncated" class="omp-source-review-truncated" role="note">
              {{ copy.reviewTruncated }}
            </p>
            <div class="omp-source-review-total" role="status" aria-live="polite">
              <span>{{ changedLabel }}</span>
              <span class="omp-source-review-total-stats">
                <span class="omp-source-review-additions">+{{ totalAdditions }}</span>
                <span class="omp-source-review-deletions">−{{ totalDeletions }}</span>
              </span>
            </div>
            <section v-for="section in reviewSections" :key="section.id" class="omp-source-review-section">
              <header class="omp-source-review-section-header">
                <button
                  class="omp-source-review-section-toggle"
                  type="button"
                  :aria-expanded="isSectionExpanded(section.id)"
                  :aria-controls="`omp-source-review-${section.id}-files`"
                  @click="toggleSection(section.id)"
                >
                  <AppIcon
                    name="chevron-right"
                    class="omp-source-review-chevron"
                    :class="{ 'omp-source-review-chevron-open': isSectionExpanded(section.id) }"
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
                  :disabled="section.files.length === 0 || gitOperationBusy"
                  @click="runSectionAction(section.id)"
                >
                  <AppIcon :name="isActionActive(sectionActionKey(section.id)) ? 'refresh-cw' : section.actionIcon" :class="{ 'omp-source-review-spin': isActionActive(sectionActionKey(section.id)) }" :size="14" aria-hidden="true" />
                </button>
              </header>
              <div v-if="isSectionExpanded(section.id)" :id="`omp-source-review-${section.id}-files`" class="omp-source-review-files" role="list">
                <article v-for="(file, index) in section.files" :key="fileKey(section.id, file)" class="omp-source-review-file" role="listitem">
                  <header class="omp-source-review-file-header">
                    <button
                      class="omp-source-review-expand"
                      type="button"
                      :aria-expanded="isFileExpanded(section.id, file)"
                      :aria-controls="fileDetailsId(section.id, index)"
                      :aria-label="fileToggleLabel(section.id, file)"
                      :title="fileToggleLabel(section.id, file)"
                      @click="toggleFile(section.id, file)"
                    >
                      <AppIcon
                        name="chevron-right"
                        class="omp-source-review-chevron"
                        :class="{ 'omp-source-review-chevron-open': isFileExpanded(section.id, file) }"
                        :size="12"
                        aria-hidden="true"
                      />
                    </button>
                    <button class="omp-source-review-file-path" type="button" :aria-label="fileOpenLabel(file)" :title="fileOpenLabel(file)" @click="openFile(section.id, file)">
                      <span class="omp-source-review-status" :class="`omp-source-review-status-${file.status}`" aria-hidden="true">{{ statusLetter(file) }}</span>
                      <span class="omp-source-review-path-copy">
                        <span v-if="file.oldPath" class="omp-source-review-old-path">{{ file.oldPath }} →</span>
                        <span class="omp-source-review-path">{{ file.path }}</span>
                      </span>
                    </button>
                    <span class="omp-source-review-counts" :aria-label="`+${file.additions}, -${file.deletions}`">
                      <span class="omp-source-review-additions">+{{ file.additions }}</span>
                      <span class="omp-source-review-deletions">−{{ file.deletions }}</span>
                    </span>
                    <button
                      class="omp-source-review-file-action"
                      type="button"
                      :aria-label="section.id === 'staged' ? copy.reviewUnstage : copy.reviewStage"
                      :title="section.id === 'staged' ? copy.reviewUnstage : copy.reviewStage"
                      :disabled="gitOperationBusy"
                      @click.stop="runFileAction(section.id, file)"
                    >
                      <AppIcon :name="isActionActive(fileActionKey(section.id, file)) ? 'refresh-cw' : section.actionIcon" :class="{ 'omp-source-review-spin': isActionActive(fileActionKey(section.id, file)) }" :size="13" aria-hidden="true" />
                    </button>
                  </header>

                  <div v-if="isFileExpanded(section.id, file)" :id="fileDetailsId(section.id, index)" class="omp-source-review-file-details">
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
      </template>
      <div v-else class="omp-source-review-state">
        <span>{{ copy.panelEmpty }}</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.omp-source-review-panel {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
}

.omp-source-review-toolbar {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 46px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}

.omp-source-review-toolbar-copy,
.omp-source-review-repository-copy,
.omp-source-review-total,
.omp-source-review-total-stats,
.omp-source-review-section-header,
.omp-source-review-section-toggle,
.omp-source-review-file-header,
.omp-source-review-file-path,
.omp-source-review-counts {
  display: flex;
  align-items: center;
}

.omp-source-review-toolbar-copy {
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
}

.omp-source-review-toolbar-copy strong {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.omp-source-review-toolbar-repository {
  max-width: 280px;
  overflow: hidden;
  color: var(--dsw-alias-label-tertiary);
  font: 10px/14px var(--ds-font-family-code);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.omp-source-review-refresh,
.omp-source-review-retry,
.omp-source-review-section-action,
.omp-source-review-file-action,
.omp-source-review-expand {
  display: grid;
  flex: none;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  transition: background var(--dsw-transition-fast), color var(--dsw-transition-fast), opacity var(--dsw-transition-fast);
}

.omp-source-review-refresh {
  width: 28px;
  height: 28px;
}

.omp-source-review-refresh:hover:not(:disabled),
.omp-source-review-section-action:hover:not(:disabled),
.omp-source-review-file-action:hover:not(:disabled),
.omp-source-review-expand:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.omp-source-review-refresh:disabled,
.omp-source-review-section-action:disabled,
.omp-source-review-file-action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.omp-source-review-refresh:focus-visible,
.omp-source-review-retry:focus-visible,
.omp-source-review-section-toggle:focus-visible,
.omp-source-review-section-action:focus-visible,
.omp-source-review-file-path:focus-visible,
.omp-source-review-file-action:focus-visible,
.omp-source-review-expand:focus-visible,
.omp-source-review-operation-button:focus-visible,
.omp-source-review-commit-button:focus-visible,
.omp-source-review-commit-input:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 1px;
}
.omp-source-review-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  scrollbar-color: var(--omp-scrollbar-thumb) transparent;
  scrollbar-width: thin;
}

.omp-source-review-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  flex-direction: column;
  gap: 7px;
  padding: 28px 18px;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
  text-align: center;
}

.omp-source-review-state strong {
  max-width: 290px;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  font-weight: 600;
}

.omp-source-review-state-error strong {
  color: var(--dsw-static-red-600);
}

.omp-source-review-state-inline {
  min-height: 180px;
}

.omp-source-review-retry {
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-button-elevated-fill);
  color: var(--dsw-alias-label-primary);
  font-size: 11px;
}

.omp-source-review-repository-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  padding: 10px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
}

.omp-source-review-repository-copy {
  min-width: 0;
  gap: 7px;
  color: var(--dsw-alias-label-primary);
}

.omp-source-review-repository-copy strong {
  overflow: hidden;
  font: 600 11px/16px var(--ds-font-family-code);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.omp-source-review-repository-status {
  flex: none;
  color: var(--dsw-alias-state-business-primary);
  font-size: 10px;
  line-height: 15px;
  text-align: right;
}

.omp-source-review-repository-status-clean {
  color: var(--dsw-alias-label-tertiary);
}
.omp-source-review-repository-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 5px;
}

.omp-source-review-operation-button,
.omp-source-review-commit-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 9px;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 5px;
  background: var(--dsw-alias-button-elevated-fill);
  color: var(--dsw-alias-label-primary);
  font-size: 11px;
  line-height: 16px;
  cursor: pointer;
}

.omp-source-review-operation-button:hover:not(:disabled),
.omp-source-review-commit-button:hover:not(:disabled) {
  border-color: var(--dsw-alias-state-business-primary);
  color: var(--dsw-alias-state-business-primary);
}

.omp-source-review-operation-button:disabled,
.omp-source-review-commit-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.omp-source-review-commit {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 9px 12px 0;
}

.omp-source-review-commit-label {
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
  line-height: 15px;
}

.omp-source-review-commit-input {
  width: 100%;
  min-height: 52px;
  padding: 7px 8px;
  resize: vertical;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 5px;
  outline: none;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: 11px/16px var(--ds-font-family-code);
}

.omp-source-review-commit-input:focus {
  border-color: var(--dsw-alias-state-business-primary);
}

.omp-source-review-action-success {
  margin: 7px 12px 0;
  color: var(--dsw-alias-state-business-primary);
  font-size: 10px;
  line-height: 15px;
}

.omp-source-review-action-error {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 8px 12px 0;
  padding: 7px 9px;
  border: 1px solid color-mix(in srgb, var(--dsw-static-red-600) 30%, transparent);
  border-radius: 5px;
  background: color-mix(in srgb, var(--dsw-static-red-600) 8%, transparent);
  color: var(--dsw-static-red-600);
  font-size: 11px;
  line-height: 16px;
}

.omp-source-review-action-error span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.omp-source-review-action-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 7px 12px 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
  line-height: 15px;
}

.omp-source-review-sections {
  padding-bottom: 10px;
}

.omp-source-review-truncated {
  margin: 8px 12px 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
  line-height: 15px;
}

.omp-source-review-total {
  justify-content: space-between;
  gap: 10px;
  min-height: 34px;
  padding: 0 12px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 16px;
}

.omp-source-review-total-stats,
.omp-source-review-section-stats,
.omp-source-review-counts {
  gap: 5px;
  font: 10px/15px var(--ds-font-family-code);
}

.omp-source-review-section {
  border-top: 1px solid var(--dsw-alias-border-l2);
}

.omp-source-review-section-header {
  min-width: 0;
  min-height: 34px;
  background: var(--dsw-alias-bg-layer-2);
}

.omp-source-review-section-toggle {
  min-width: 0;
  flex: 1 1 auto;
  gap: 6px;
  min-height: 34px;
  padding: 0 6px 0 10px;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  text-align: left;
  cursor: pointer;
}

.omp-source-review-section-toggle strong {
  overflow: hidden;
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.omp-source-review-chevron {
  flex: none;
  color: var(--dsw-alias-label-tertiary);
  transition: transform var(--dsw-transition-fast);
}

.omp-source-review-chevron-open {
  transform: rotate(90deg);
}

.omp-source-review-section-count {
  display: inline-grid;
  min-width: 18px;
  height: 18px;
  place-items: center;
  border-radius: 9px;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font: 10px/18px var(--ds-font-family-code);
}

.omp-source-review-section-stats {
  display: flex;
  flex: none;
  gap: 5px;
  margin-left: auto;
}

.omp-source-review-section-action {
  width: 28px;
  height: 28px;
  margin-right: 5px;
}

.omp-source-review-files {
  background: var(--dsw-alias-bg-base);
}

.omp-source-review-file {
  min-width: 0;
  border-top: 1px solid var(--dsw-alias-border-l2);
}

.omp-source-review-file-header {
  min-width: 0;
  min-height: 34px;
}

.omp-source-review-file-header:hover,
.omp-source-review-file-header:focus-within {
  background: var(--dsw-alias-interactive-bg-hover);
}

.omp-source-review-expand {
  width: 26px;
  height: 28px;
  margin-left: 3px;
}

.omp-source-review-file-path {
  min-width: 0;
  flex: 1 1 auto;
  gap: 6px;
  min-height: 34px;
  padding: 4px 3px;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  text-align: left;
  cursor: pointer;
}

.omp-source-review-file-path:hover .omp-source-review-path {
  color: var(--dsw-alias-state-business-primary);
}

.omp-source-review-status {
  display: grid;
  flex: none;
  width: 17px;
  height: 17px;
  place-items: center;
  border-radius: 3px;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font: 600 9px/1 var(--ds-font-family-code);
}

.omp-source-review-status-added,
.omp-source-review-status-modified,
.omp-source-review-status-untracked {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 15%, transparent);
  color: var(--dsw-alias-state-business-primary);
}

.omp-source-review-status-deleted {
  background: color-mix(in srgb, var(--dsw-static-red-400) 15%, transparent);
  color: var(--dsw-static-red-600);
}

.omp-source-review-status-renamed {
  background: color-mix(in srgb, #d7a928 16%, transparent);
  color: #c18b12;
}

.omp-source-review-path-copy {
  display: grid;
  min-width: 0;
  gap: 1px;
  font: 11px/15px var(--ds-font-family-code);
}

.omp-source-review-path,
.omp-source-review-old-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.omp-source-review-old-path {
  color: var(--dsw-alias-label-caption);
  font-size: 9px;
}

.omp-source-review-counts {
  flex: none;
  padding: 0 4px 0 2px;
}

.omp-source-review-file-action {
  width: 25px;
  height: 27px;
  margin-right: 4px;
  opacity: 0;
}

.omp-source-review-file-header:hover .omp-source-review-file-action,
.omp-source-review-file-header:focus-within .omp-source-review-file-action,
.omp-source-review-file-action:focus-visible {
  opacity: 1;
}

.omp-source-review-file-details {
  border-top: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-markdown-code-block);
}

.omp-source-review-file-message {
  margin: 0;
  padding: 12px 14px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 17px;
}

.omp-source-review-hunk + .omp-source-review-hunk {
  border-top: 1px solid var(--dsw-alias-border-l2);
}

.omp-source-review-hunk-header {
  margin: 0;
  padding: 6px 10px;
  background: var(--dsw-alias-markdown-code-block-banner);
  color: var(--dsw-alias-label-secondary);
  font: 10px/15px var(--ds-font-family-code);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.omp-source-review-lines {
  overflow-x: auto;
  font: var(--dsw-font-markdown-code-block);
}

.omp-source-review-line {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  min-width: max-content;
  padding-right: 9px;
}

.omp-source-review-line-marker {
  color: var(--dsw-alias-label-caption);
  text-align: center;
  user-select: none;
}

.omp-source-review-line code {
  min-width: 0;
  color: var(--dsw-alias-label-primary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.omp-source-review-line-add {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 11%, transparent);
}

.omp-source-review-line-add .omp-source-review-line-marker {
  color: var(--dsw-alias-state-business-primary);
}

.omp-source-review-line-del {
  background: color-mix(in srgb, var(--dsw-static-red-400) 11%, transparent);
}

.omp-source-review-line-del .omp-source-review-line-marker {
  color: var(--dsw-static-red-600);
}

.omp-source-review-additions {
  color: var(--dsw-alias-state-business-primary);
}

.omp-source-review-deletions {
  color: var(--dsw-static-red-600);
}

.omp-source-review-spin {
  animation: omp-source-review-spin 700ms linear infinite;
}

@keyframes omp-source-review-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 560px) {
  .omp-source-review-repository-bar {
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
  }

  .omp-source-review-repository-status {
    padding-left: 22px;
    text-align: left;
  }

  .omp-source-review-section-stats {
    display: none;
  }
}
</style>
