<script setup lang="ts">
import { toRef } from 'vue'

import { useWorkspaceReviewPanel } from '../composables/useWorkspaceReviewPanel'
import type { ReviewDiffTarget } from '../utils/desktopApi'
import SourceReviewChanges from './SourceReviewChanges.vue'
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
  runSectionAction,
  isFileExpanded,
  toggleFile,
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
          <SourceReviewChanges
            :sections="reviewSections"
            :changed-label="changedLabel"
            :total-additions="totalAdditions"
            :total-deletions="totalDeletions"
            :truncated="review.truncated"
            :git-operation-busy="gitOperationBusy"
            :is-section-expanded="isSectionExpanded"
            :is-action-active="isActionActive"
            :is-file-expanded="isFileExpanded"
            @toggle-section="toggleSection"
            @section-action="runSectionAction"
            @toggle-file="toggleFile"
            @open-file="openFile"
            @file-action="runFileAction"
          />
        </template>
      </template>
      <div v-else class="omp-source-review-state">
        <span>{{ copy.panelEmpty }}</span>
      </div>
    </div>
  </aside>
</template>
