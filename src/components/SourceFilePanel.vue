<script setup lang="ts">
import { toRef } from 'vue'

import {
  useWorkspaceFilePanel,
  type WorkspaceFilePanelRequestedFile,
} from '../composables/useWorkspaceFilePanel'
import { AppIcon } from './icons'

interface SourceFilePanelProps {
  workspacePath: string | null
  requestedFile?: WorkspaceFilePanelRequestedFile | null
  refreshToken?: number
}

const props = defineProps<SourceFilePanelProps>()

const {
  copy,
  workspaceLabel,
  rootLoading,
  rootError,
  hasRootEntries,
  expandedDirectories,
  collapseAllDirectories,
  searchQuery,
  clearFileSearch,
  searchActive,
  searchLoading,
  searchError,
  searchResults,
  searchMatchAriaLabel,
  getFileTypeMeta,
  fileNameForPath,
  searchMatchLocation,
  searchMatchKindLabel,
  searchTruncated,
  retrySearch,
  visibleTreeRows,
  isDirectoryExpanded,
  isDirectoryLoading,
  getDirectoryError,
  retryDirectory,
  openTreeRow,
  openFile,
  refreshWorkspace,
  selectedPath,
  DEFAULT_FILE_TYPE,
  selectedFileType,
  backToTree,
  selectedFileName,
  revealSelectedFile,
  fileResult,
  editing,
  copied,
  copySelectedFile,
  canEditSelectedFile,
  startEditing,
  saveLoading,
  saveSelectedFile,
  cancelEditing,
  saveError,
  saveSuccess,
  revealError,
  copyError,
  fileLoading,
  fileError,
  retrySelectedFile,
  selectedFileSize,
  formatBytes,
  highlightError,
  draftContent,
  highlightedCode,
} = useWorkspaceFilePanel({
  workspacePath: toRef(props, 'workspacePath'),
  requestedFile: toRef(props, 'requestedFile'),
  refreshToken: toRef(props, 'refreshToken'),
})
</script>

<template>
  <section class="omp-source-file-panel" :aria-label="copy.fileExplorerTitle">
    <header class="omp-source-file-panel-header">
      <div class="omp-source-file-panel-heading">
        <div class="omp-source-file-panel-heading-copy">
          <span class="omp-source-file-panel-eyebrow">{{ copy.fileExplorerTitle }}</span>
          <strong :title="props.workspacePath ?? copy.fileNoWorkspace">{{ workspaceLabel || copy.filesTab }}</strong>
        </div>
      </div>
      <div class="omp-source-file-panel-actions">
        <button
          class="omp-source-file-panel-action"
          type="button"
          :aria-label="copy.fileCollapseAll"
          :title="copy.fileCollapseAll"
          :disabled="props.workspacePath === null || expandedDirectories.size === 0"
          @click="collapseAllDirectories"
        >
          <AppIcon name="minimize-2" :size="15" aria-hidden="true" />
        </button>
        <button
          class="omp-source-file-panel-action"
          type="button"
          :aria-label="copy.panelRefresh"
          :title="copy.panelRefresh"
          :disabled="props.workspacePath === null || rootLoading"
          @click="refreshWorkspace"
        >
          <AppIcon name="refresh-cw" :size="15" aria-hidden="true" />
        </button>
      </div>
    </header>
    <div class="omp-source-file-panel-columns">
      <aside class="omp-source-file-panel-browser" :aria-label="copy.filesTab">
        <div class="omp-source-file-panel-search-bar">
          <AppIcon name="search" class="omp-source-file-panel-search-icon" :size="15" aria-hidden="true" />
          <input
            v-model="searchQuery"
            class="omp-source-file-panel-search-input"
            type="search"
            :placeholder="copy.fileSearchPlaceholder"
            :aria-label="copy.fileSearchPlaceholder"
            :title="copy.fileSearchPlaceholder"
            :disabled="props.workspacePath === null"
          />
          <button
            v-if="searchQuery.length > 0"
            class="omp-source-file-panel-search-clear"
            type="button"
            :aria-label="copy.fileSearchClear"
            :title="copy.fileSearchClear"
            @click="clearFileSearch"
          >
            <AppIcon name="x" :size="13" aria-hidden="true" />
          </button>
        </div>

        <div v-if="props.workspacePath === null" class="omp-source-file-panel-state" role="status">
          <AppIcon name="folder-open" :size="22" aria-hidden="true" />
          <strong>{{ copy.fileNoWorkspace }}</strong>
          <span>{{ copy.fileNoWorkspaceHint }}</span>
        </div>
        <template v-else-if="searchActive">
          <div v-if="searchLoading" class="omp-source-file-panel-search-state" role="status" aria-live="polite">
            <AppIcon name="search" class="omp-source-file-panel-spin" :size="18" aria-hidden="true" />
            <span>{{ copy.fileSearchLoading }}</span>
          </div>
          <div v-else-if="searchError !== null" class="omp-source-file-panel-state omp-source-file-panel-state-error" role="alert">
            <AppIcon name="circle-alert" :size="22" aria-hidden="true" />
            <strong>{{ copy.panelError }}</strong>
            <span>{{ searchError }}</span>
            <button type="button" :aria-label="copy.panelRefresh" :title="copy.panelRefresh" @click="retrySearch">{{ copy.panelRefresh }}</button>
          </div>
          <div v-else-if="searchResults.length === 0" class="omp-source-file-panel-search-state" role="status">
            <AppIcon name="search" :size="20" aria-hidden="true" />
            <span>{{ copy.fileSearchNoMatches }}</span>
          </div>
          <div v-else class="omp-source-file-panel-search-results" role="list" :aria-busy="searchLoading">
            <button
              v-for="match in searchResults"
              :key="`${match.kind}:${match.path}:${match.line ?? ''}:${match.column ?? ''}`"
              class="omp-source-file-panel-search-result"
              :class="getFileTypeMeta(match.path).className"
              type="button"
              :aria-label="searchMatchAriaLabel(match)"
              :title="match.path"
              @click="openFile(match.path)"
            >
              <AppIcon :name="getFileTypeMeta(match.path).icon" class="omp-source-file-panel-search-result-icon" :size="15" aria-hidden="true" />
              <span class="omp-source-file-panel-search-result-copy">
                <span class="omp-source-file-panel-search-result-heading">
                  <strong>{{ fileNameForPath(match.path) }}</strong>
                  <span class="omp-source-file-panel-search-result-type">{{ getFileTypeMeta(match.path).label }}</span>
                </span>
                <span class="omp-source-file-panel-search-result-path">{{ match.path }}</span>
                <span v-if="match.snippet || searchMatchLocation(match).length > 0" class="omp-source-file-panel-search-result-detail">
                  <span v-if="searchMatchLocation(match).length > 0" class="omp-source-file-panel-search-result-location">{{ searchMatchLocation(match) }}</span>
                  <code v-if="match.snippet">{{ match.snippet }}</code>
                </span>
              </span>
              <span class="omp-source-file-panel-search-result-kind">{{ searchMatchKindLabel(match) }}</span>
            </button>
            <div v-if="searchTruncated" class="omp-source-file-panel-search-more" role="status">{{ copy.fileSearchMore }}</div>
          </div>
        </template>
        <template v-else>
          <div v-if="rootError !== null" class="omp-source-file-panel-error" role="alert">
            <AppIcon name="circle-alert" :size="16" aria-hidden="true" />
            <span>{{ rootError }}</span>
            <button type="button" :aria-label="copy.panelRefresh" :title="copy.panelRefresh" @click="retryDirectory('')">{{ copy.panelRefresh }}</button>
          </div>
          <div v-if="rootLoading && !hasRootEntries" class="omp-source-file-panel-state" role="status">
            <AppIcon name="refresh-cw" class="omp-source-file-panel-spin" :size="18" aria-hidden="true" />
            <span>{{ copy.fileLoading }}</span>
          </div>
          <div v-else-if="!hasRootEntries && rootError === null" class="omp-source-file-panel-state" role="status">
            <AppIcon name="folder-open" :size="22" aria-hidden="true" />
            <span>{{ copy.fileEmpty }}</span>
          </div>
          <div v-else class="omp-source-file-panel-tree" role="tree" :aria-busy="rootLoading">
            <div class="omp-source-file-panel-root" :title="props.workspacePath">
              <AppIcon name="folder-open" :size="15" aria-hidden="true" />
              <span>{{ workspaceLabel }}</span>
              <AppIcon v-if="rootLoading" name="refresh-cw" class="omp-source-file-panel-spin" :size="13" aria-hidden="true" />
            </div>
            <template v-for="row in visibleTreeRows" :key="row.path">
              <button
                class="omp-source-file-panel-tree-row"
                :class="[
                  row.entry.kind === 'dir' ? 'omp-source-file-panel-tree-directory' : 'omp-source-file-panel-tree-file',
                  getFileTypeMeta(row.path, row.entry.kind === 'dir').className,
                  { 'omp-source-file-panel-tree-row-selected': selectedPath === row.path },
                ]"
                type="button"
                role="treeitem"
                :aria-level="row.depth + 1"
                :aria-expanded="row.entry.kind === 'dir' ? isDirectoryExpanded(row.path) : undefined"
                :aria-selected="row.entry.kind === 'file' ? selectedPath === row.path : undefined"
                :aria-busy="row.entry.kind === 'dir' ? isDirectoryLoading(row.path) : undefined"
                :title="row.path"
                :style="{ '--omp-source-file-depth': row.depth }"
                @click="openTreeRow(row)"
              >
                <AppIcon
                  v-if="row.entry.kind === 'dir'"
                  name="chevron-right"
                  class="omp-source-file-panel-tree-chevron"
                  :class="{ 'omp-source-file-panel-tree-chevron-open': isDirectoryExpanded(row.path) }"
                  :size="13"
                  aria-hidden="true"
                />
                <span v-else class="omp-source-file-panel-tree-chevron-spacer" aria-hidden="true" />
                <AppIcon
                  :name="row.entry.kind === 'dir' ? (isDirectoryExpanded(row.path) ? 'folder-open' : 'folder') : getFileTypeMeta(row.path).icon"
                  class="omp-source-file-panel-tree-icon"
                  :size="15"
                  aria-hidden="true"
                />
                <span class="omp-source-file-panel-tree-name">{{ row.entry.name }}</span>
                <span v-if="row.entry.kind === 'file'" class="omp-source-file-panel-tree-size">{{ formatBytes(row.entry.size) }}</span>
                <AppIcon v-if="row.entry.kind === 'dir' && isDirectoryLoading(row.path)" name="refresh-cw" class="omp-source-file-panel-spin" :size="13" aria-hidden="true" />
              </button>
              <div v-if="row.entry.kind === 'dir' && isDirectoryExpanded(row.path) && getDirectoryError(row.path) !== null" class="omp-source-file-panel-tree-error" role="alert">
                <span>{{ getDirectoryError(row.path) }}</span>
                <button type="button" :aria-label="copy.panelRefresh" :title="copy.panelRefresh" @click.stop="retryDirectory(row.path)">{{ copy.panelRefresh }}</button>
              </div>
            </template>
          </div>
        </template>
      </aside>

      <section class="omp-source-file-panel-preview" :aria-label="selectedPath ?? copy.fileNoSelection">
        <header class="omp-source-file-panel-preview-header">
          <div
            class="omp-source-file-panel-preview-heading"
            :class="selectedPath === null ? DEFAULT_FILE_TYPE.className : selectedFileType.className"
          >
            <button
              v-if="selectedPath !== null"
              class="omp-source-file-panel-back"
              type="button"
              :aria-label="copy.fileBack"
              :title="copy.fileBack"
              @click="backToTree"
            >
              <AppIcon name="chevron-left" :size="16" aria-hidden="true" />
            </button>
            <AppIcon
              :name="selectedPath === null ? 'file-text' : selectedFileType.icon"
              class="omp-source-file-panel-preview-type-icon"
              :class="selectedPath === null ? DEFAULT_FILE_TYPE.className : selectedFileType.className"
              :size="16"
              aria-hidden="true"
            />
            <div class="omp-source-file-panel-preview-heading-copy">
              <strong v-if="selectedPath !== null" :title="selectedPath">{{ selectedFileName }}</strong>
              <strong v-else>{{ copy.fileNoSelection }}</strong>
              <span v-if="selectedPath !== null" class="omp-source-file-panel-preview-path" :title="selectedPath">{{ selectedPath }}</span>
              <span v-else class="omp-source-file-panel-preview-hint">{{ copy.fileNoSelectionHint }}</span>
            </div>
          </div>
          <div class="omp-source-file-panel-actions">
            <button
              v-if="selectedPath !== null"
              class="omp-source-file-panel-action"
              type="button"
              :aria-label="copy.fileReveal"
              :title="copy.fileReveal"
              @click="revealSelectedFile"
            >
              <AppIcon name="external-link" :size="15" aria-hidden="true" />
            </button>
            <button
              v-if="selectedPath !== null && fileResult?.kind === 'text' && !editing"
              class="omp-source-file-panel-action"
              type="button"
              :aria-label="copy.fileCopy"
              :title="copy.fileCopy"
              @click="copySelectedFile"
            >
              <AppIcon :name="copied ? 'check' : 'copy'" :size="15" aria-hidden="true" />
            </button>
            <button
              v-if="canEditSelectedFile && !editing"
              class="omp-source-file-panel-action"
              type="button"
              :aria-label="copy.fileEdit"
              :title="copy.fileEdit"
              @click="startEditing"
            >
              <AppIcon name="pencil-line" :size="15" aria-hidden="true" />
            </button>
            <button
              v-if="editing"
              class="omp-source-file-panel-action"
              type="button"
              :aria-label="copy.fileSave"
              :title="copy.fileSave"
              :disabled="saveLoading"
              @click="saveSelectedFile"
            >
              <AppIcon :name="saveLoading ? 'refresh-cw' : 'check'" :class="{ 'omp-source-file-panel-spin': saveLoading }" :size="15" aria-hidden="true" />
            </button>
            <button
              v-if="editing"
              class="omp-source-file-panel-action"
              type="button"
              :aria-label="copy.fileCancel"
              :title="copy.fileCancel"
              :disabled="saveLoading"
              @click="cancelEditing"
            >
              <AppIcon name="x" :size="15" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div class="omp-source-file-panel-preview-content">
          <div v-if="selectedPath === null" class="omp-source-file-panel-state" role="status">
            <AppIcon name="file-text" :size="22" aria-hidden="true" />
            <strong>{{ copy.fileNoSelection }}</strong>
            <span>{{ copy.fileNoSelectionHint }}</span>
          </div>
          <template v-else>
            <div v-if="saveError !== null" class="omp-source-file-panel-inline-error" role="alert">
              <strong>{{ copy.fileSaveError }}</strong>
              <span>{{ saveError }}</span>
            </div>
            <div v-if="saveLoading" class="omp-source-file-panel-save-status" role="status" aria-live="polite">
              <AppIcon name="refresh-cw" class="omp-source-file-panel-spin" :size="14" aria-hidden="true" />
              <span>{{ copy.fileSaving }}</span>
            </div>
            <div v-else-if="saveSuccess" class="omp-source-file-panel-save-status omp-source-file-panel-save-status-success" role="status" aria-live="polite">
              <AppIcon name="check" :size="14" aria-hidden="true" />
              <span>{{ copy.fileSaved }}</span>
            </div>
            <div v-if="revealError !== null" class="omp-source-file-panel-inline-error" role="alert">{{ revealError }}</div>
            <div v-if="copyError !== null" class="omp-source-file-panel-inline-error" role="alert">{{ copyError }}</div>
            <div v-if="fileLoading" class="omp-source-file-panel-state" role="status">
              <AppIcon name="refresh-cw" class="omp-source-file-panel-spin" :size="18" aria-hidden="true" />
              <span>{{ copy.fileLoading }}</span>
            </div>
            <div v-else-if="fileError !== null" class="omp-source-file-panel-state omp-source-file-panel-state-error" role="alert">
              <AppIcon name="circle-alert" :size="22" aria-hidden="true" />
              <strong>{{ copy.fileError }}</strong>
              <span>{{ fileError }}</span>
              <button type="button" :aria-label="copy.panelRefresh" :title="copy.panelRefresh" @click="retrySelectedFile">{{ copy.panelRefresh }}</button>
            </div>
            <template v-else-if="fileResult?.kind === 'text'">
              <div class="omp-source-file-panel-file-meta">
                <span class="omp-source-file-panel-file-type" :class="selectedFileType.className">
                  <AppIcon :name="selectedFileType.icon" :size="13" aria-hidden="true" />
                  {{ selectedFileType.label }}
                </span>
                <span v-if="selectedFileSize !== null">{{ formatBytes(selectedFileSize) }}</span>
              </div>
              <div v-if="highlightError !== null" class="omp-source-file-panel-highlight-error" role="status">{{ highlightError }}</div>
              <div v-if="editing" class="omp-source-file-panel-editor">
                <textarea
                  v-model="draftContent"
                  class="omp-source-file-panel-editor-textarea"
                  :aria-label="selectedPath"
                  :disabled="saveLoading"
                  spellcheck="false"
                  wrap="off"
                  @keydown.ctrl.s.prevent="saveSelectedFile"
                  @keydown.meta.s.prevent="saveSelectedFile"
                />
              </div>
              <div v-else class="omp-source-file-panel-code" :aria-label="selectedPath">
                <div v-if="highlightedCode" class="omp-source-file-panel-code-highlighted" v-html="highlightedCode" />
                <pre v-else><code>{{ fileResult.content ?? '' }}</code></pre>
              </div>
            </template>
            <div v-else-if="fileResult?.kind === 'image'" class="omp-source-file-panel-image-state">
              <img v-if="fileResult.dataUrl" :src="fileResult.dataUrl" :alt="selectedFileName" />
              <div v-else class="omp-source-file-panel-state omp-source-file-panel-state-error" role="alert">
                <AppIcon name="circle-alert" :size="22" aria-hidden="true" />
                <strong>{{ copy.fileError }}</strong>
              </div>
              <span v-if="selectedFileSize !== null">{{ formatBytes(selectedFileSize) }}</span>
            </div>
            <div v-else-if="fileResult?.kind === 'binary'" class="omp-source-file-panel-state" role="status">
              <AppIcon name="file-diff" :size="22" aria-hidden="true" />
              <strong>{{ copy.fileBinary }}</strong>
              <span v-if="selectedFileSize !== null">{{ formatBytes(selectedFileSize) }}</span>
            </div>
            <div v-else-if="fileResult?.kind === 'tooLarge'" class="omp-source-file-panel-state" role="status">
              <AppIcon name="file-diff" :size="22" aria-hidden="true" />
              <strong>{{ copy.fileTooLarge }}</strong>
              <span v-if="selectedFileSize !== null">{{ formatBytes(selectedFileSize) }}</span>
            </div>
            <div v-else class="omp-source-file-panel-state omp-source-file-panel-state-error" role="alert">
              <AppIcon name="circle-alert" :size="22" aria-hidden="true" />
              <strong>{{ copy.fileError }}</strong>
            </div>
          </template>
        </div>
      </section>
    </div>
  </section>
</template>
