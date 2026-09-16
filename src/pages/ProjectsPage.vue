<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AppIcon } from '../components/icons'

import EmptyState from '../components/EmptyState.vue'
import PageHeader from '../components/PageHeader.vue'
import { useAppStore, type ProjectRecord, type SessionRecord } from '../stores/app'

type SortMode = 'recent' | 'name'
type GroupId = 'pinned' | 'projects' | 'archived'

const props = defineProps<{ embedded?: boolean }>()
const router = useRouter()
const store = useAppStore()
const query = ref('')
const sort = ref<SortMode>('recent')
const expanded = ref<Record<string, boolean>>({})

const projectSessions = (project: ProjectRecord): SessionRecord[] =>
  store.sessions.value
    .filter((session) => session.projectPath === project.path)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))

const filteredProjects = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase()
  return store.projects.value
    .filter((project) => {
      if (!needle) return true
      return [project.name, project.path].some((value) => value.toLocaleLowerCase().includes(needle))
    })
    .sort((a, b) => {
      if (sort.value === 'name') return a.name.localeCompare(b.name, 'zh-CN')
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.name.localeCompare(b.name, 'zh-CN')
    })
})

const groups = computed(() => {
  const groupFor = (project: ProjectRecord): GroupId =>
    project.archived ? 'archived' : project.pinned ? 'pinned' : 'projects'
  const labels: Record<GroupId, string> = { pinned: '已固定', projects: '项目', archived: '已归档' }
  return (['pinned', 'projects', 'archived'] as const)
    .map((id) => ({ id, label: labels[id], rows: filteredProjects.value.filter((project) => groupFor(project) === id) }))
    .filter((group) => group.rows.length > 0)
})

const sessionCount = (project: ProjectRecord) => projectSessions(project).length
const formatUpdated = (value: string) => {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return '尚未更新'
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(timestamp)
}

function toggleProject(id: string) {
  expanded.value = { ...expanded.value, [id]: !expanded.value[id] }
}

async function openProject(project: ProjectRecord) {
  const session = projectSessions(project)[0]
  if (session) await store.selectSession(session.id)
  else await store.createSession(project.path)
  await router.push('/')
}

async function startSession(projectPath?: string) {
  await store.createSession(projectPath)
  await router.push('/')
}

async function openSession(session: SessionRecord) {
  await store.selectSession(session.id)
  await router.push('/')
}
</script>

<template>
  <section class="page-frame projects-page settings-project-archive" :class="{ 'projects-page-embedded': props.embedded }" aria-labelledby="projects-title">
    <PageHeader
      v-if="!props.embedded"
      heading-id="projects-title"
      title="项目"
      description="按最近使用情况整理工作区，并从项目直接开始新的会话。"
    />
    <div v-else class="projects-intro">
      <p class="projects-intro-desc">管理固定、活跃和已归档的项目，会话记录会随项目归类。</p>
    </div>

    <div class="projects-toolbar">
      <div class="settings-segment projects-sort" role="group" aria-label="项目排序">
        <button class="settings-segment-item projects-sort-btn" :class="{ active: sort === 'recent' }" type="button" :aria-pressed="sort === 'recent'" @click="sort = 'recent'">最近</button>
        <button class="settings-segment-item projects-sort-btn" :class="{ active: sort === 'name' }" type="button" :aria-pressed="sort === 'name'" @click="sort = 'name'">名称</button>
      </div>
      <label class="projects-search-wrap">
        <AppIcon name="search" :size="16" aria-hidden="true" />
        <input v-model="query" class="projects-search" type="search" placeholder="搜索项目或路径" aria-label="搜索项目或路径" />
      </label>
      <span v-if="query" class="projects-result-count" aria-live="polite">{{ filteredProjects.length }} 个结果</span>
      <div class="projects-toolbar-actions">
        <button class="btn btn-secondary" type="button" @click="void startSession()">
          <AppIcon name="plus" :size="16" aria-hidden="true" />
          新建会话
        </button>
      </div>
    </div>

    <div v-if="groups.length === 0" class="projects-empty-wrap">
      <EmptyState
        :title="store.projects.value.length === 0 ? '还没有项目记录' : '没有匹配的项目'"
        :description="store.projects.value.length === 0 ? '从工作台新建会话后，项目会显示在这里。' : '调整搜索词，或清除筛选后继续浏览。'"
      >
        <template #icon><AppIcon name="archive" :size="20" aria-hidden="true" /></template>
        <template #action>
          <button v-if="query" class="btn btn-secondary" type="button" @click="query = ''">清除搜索</button>
          <button v-else class="btn btn-primary" type="button" @click="void startSession()">开始第一个会话</button>
        </template>
      </EmptyState>
    </div>

    <div v-else class="settings-panel projects-list">
      <section v-for="group in groups" :key="group.id" class="projects-group" :aria-labelledby="`projects-group-${group.id}`">
        <div class="projects-group-head">
          <h2 :id="`projects-group-${group.id}`" class="projects-group-label">{{ group.label }}</h2>
          <span class="projects-group-count">{{ group.rows.length }}</span>
        </div>
        <div class="projects-group-rows" role="list">
          <article v-for="project in group.rows" :key="project.id" class="projects-row-block" :class="{ active: store.workspace.value?.path === project.path, archived: project.archived, expanded: expanded[project.id] }" role="listitem">
            <div class="projects-row">
              <button class="projects-expand" type="button" :aria-expanded="expanded[project.id] === true" :aria-label="`${expanded[project.id] ? '收起' : '展开'} ${project.name}`" @click="toggleProject(project.id)">
                <AppIcon v-if="expanded[project.id]" name="chevron-down" :size="16" aria-hidden="true" /><AppIcon v-else name="chevron-right" :size="16" aria-hidden="true" />
              </button>
              <button class="projects-name-btn" type="button" :title="project.path" @click="void openProject(project)">
                <span class="projects-glyph"><AppIcon v-if="project.pinned" name="star" :size="16" aria-hidden="true" /><AppIcon v-else name="folder" :size="16" aria-hidden="true" /></span>
                <span class="projects-name-copy">
                  <span class="projects-name-title"><span class="projects-name-text">{{ project.name }}</span><span v-if="store.workspace.value?.path === project.path" class="projects-tag is-active">当前</span></span>
                  <span class="projects-name-meta"><span class="projects-name-path">{{ project.path }}</span><span class="projects-meta-dot" aria-hidden="true">·</span><span class="projects-name-sessions">{{ sessionCount(project) }} 个会话</span></span>
                </span>
              </button>
              <span class="projects-updated">{{ formatUpdated(project.updatedAt) }}</span>
              <div class="projects-row-actions">
                <button class="projects-icon-btn" type="button" aria-label="新建项目会话" title="新建项目会话" @click="void startSession(project.path)"><AppIcon name="plus" :size="16" aria-hidden="true" /></button>
                <button class="projects-icon-btn" type="button" aria-label="打开项目" title="打开项目" @click="void openProject(project)"><AppIcon name="external-link" :size="16" aria-hidden="true" /></button>
              </div>
            </div>
            <div v-if="expanded[project.id]" class="projects-row-detail">
              <div class="projects-detail-header"><span class="projects-detail-label">{{ sessionCount(project) }} 个会话</span><button class="btn btn-ghost projects-detail-new" type="button" @click="void startSession(project.path)"><AppIcon name="plus" :size="16" aria-hidden="true" />新建会话</button></div>
              <div v-if="projectSessions(project).length === 0" class="projects-detail-empty">此项目还没有会话。</div>
              <div v-else class="projects-detail-tasks">
                <button v-for="session in projectSessions(project)" :key="session.id" class="projects-detail-task" type="button" @click="void openSession(session)"><AppIcon name="message-square" :size="16" class="projects-detail-task-icon" aria-hidden="true" /><span class="projects-detail-task-title">{{ session.title }}</span><span class="projects-detail-task-updated">{{ formatUpdated(session.updatedAt) }}</span></button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
