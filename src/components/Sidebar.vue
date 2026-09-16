<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AppIcon, type AppIconName } from './icons'
import BrandLogo from './BrandLogo.vue'
import {
  useAppStore,
  type AppPage,
  type ProjectRecord,
  type SessionRecord,
} from '../stores/app'
const routePaths: Record<AppPage, string> = {
  chat: '/',
  projects: '/projects',
  pulls: '/pulls',
  scheduled: '/scheduled',
  settings: '/settings',
}
type NavigationItem = {
  page: AppPage
  label: string
  icon: AppIconName
}

const navigationItems: readonly NavigationItem[] = [
  { page: 'chat', label: '工作台', icon: 'message-square' },
  { page: 'projects', label: '项目', icon: 'folder' },
  { page: 'pulls', label: 'Pull requests', icon: 'git-pull-request-arrow' },
  { page: 'scheduled', label: 'Scheduled', icon: 'clock' },
  { page: 'settings', label: '设置', icon: 'settings' },
]

const statusLabels: Record<SessionRecord['status'], string> = {
  idle: '空闲',
  running: '运行中',
  completed: '已完成',
  error: '出错',
}


const route = useRoute()
const router = useRouter()
const {
  sessions,
  activeSessionId,
  projects,
  sidebarCollapsed,
  toggleSidebar,
  selectSession,
  createSession,
} = useAppStore()

const activePage = computed<AppPage>(() => {
  const page = (Object.keys(routePaths) as AppPage[]).find(
    (candidate) => routePaths[candidate] === route.path,
  )
  return page ?? 'chat'
})

const visibleSessions = computed(() => sessions.value.slice(0, 8))
const visibleProjects = computed(() => projects.value.slice(0, 6))

function navigate(page: AppPage) {
  if (route.path !== routePaths[page]) {
    void router.push(routePaths[page])
  }
}

function startNewTask() {
  createSession()
  navigate('chat')
}

function openSession(id: string) {
  selectSession(id)
  navigate('chat')
}

function openProject(project: ProjectRecord) {
  void router.push({ path: routePaths.projects, query: { path: project.path } })
}

function formatUpdatedAt(value: string): string {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return value

  const elapsed = Math.max(0, Date.now() - timestamp)
  if (elapsed < 60_000) return '刚刚'
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)} 分钟前`
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)} 小时前`

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  }).format(timestamp)
}
</script>

<template>
  <aside
    id="app-sidebar"
    class="sidebar"
    :class="{ 'is-collapsed': sidebarCollapsed }"
    aria-label="主导航"
  >
    <header class="sidebar-header">
      <button
        class="sidebar-brand"
        type="button"
        aria-label="返回工作台"
        title="返回工作台"
        @click="navigate('chat')"
      >
        <BrandLogo :size="24" />
        <span v-if="!sidebarCollapsed" class="brand-copy">
          <strong>OMP</strong>
          <small>Desktop</small>
        </span>
      </button>
      <button
        class="sidebar-toggle"
        type="button"
        :aria-label="sidebarCollapsed ? '展开侧栏' : '收起侧栏'"
        :aria-expanded="!sidebarCollapsed"
        aria-controls="app-sidebar"
        title="切换侧栏"
        @click="toggleSidebar"
      >
        <AppIcon name="panel-left" :size="16" aria-hidden="true" />
      </button>
    </header>

    <div class="sidebar-body">
      <button
        class="new-task-button"
        type="button"
        aria-label="新建任务"
        title="新建任务"
        @click="startNewTask"
      >
        <span class="button-symbol" aria-hidden="true"><AppIcon name="message-square-plus" :size="16" /></span>
        <span v-if="!sidebarCollapsed">新建任务</span>
      </button>

      <nav class="sidebar-nav" aria-label="页面导航">
        <button
          v-for="item in navigationItems"
          :key="item.page"
          class="sidebar-nav-item"
          :class="{ 'is-active': activePage === item.page }"
          type="button"
          :aria-current="activePage === item.page ? 'page' : undefined"
          :title="item.label"
          @click="navigate(item.page)"
        >
          <span class="nav-symbol" aria-hidden="true"><AppIcon :name="item.icon" :size="16" /></span>
          <span v-if="!sidebarCollapsed">{{ item.label }}</span>
        </button>
      </nav>

      <section v-if="!sidebarCollapsed" class="sidebar-section" aria-labelledby="sessions-heading">
        <div class="sidebar-section-heading">
          <h2 id="sessions-heading">Sessions</h2>
          <span class="sidebar-section-count">{{ sessions.length }}</span>
        </div>
        <div class="sidebar-list">
          <button
            v-for="session in visibleSessions"
            :key="session.id"
            class="session-item"
            :class="{ 'is-active': activeSessionId === session.id }"
            type="button"
            :aria-current="activeSessionId === session.id ? 'true' : undefined"
            @click="openSession(session.id)"
          >
            <span
              class="session-status"
              :class="`is-${session.status}`"
              :aria-label="statusLabels[session.status]"
              :title="statusLabels[session.status]"
            />
            <span class="session-copy">
              <span class="session-title">{{ session.title }}</span>
              <span class="session-meta">
                {{ statusLabels[session.status] }} · {{ formatUpdatedAt(session.updatedAt) }}
              </span>
            </span>
            <span v-if="session.pinned" class="session-pin" aria-label="已置顶" title="已置顶"><AppIcon name="star" :size="13" aria-hidden="true" /></span>
          </button>
          <p v-if="visibleSessions.length === 0" class="sidebar-empty">暂无会话</p>
        </div>
      </section>

      <section v-if="!sidebarCollapsed" class="sidebar-section" aria-labelledby="projects-heading">
        <div class="sidebar-section-heading">
          <h2 id="projects-heading">Projects</h2>
          <span class="sidebar-section-count">{{ projects.length }}</span>
        </div>
        <div class="sidebar-list">
          <button
            v-for="project in visibleProjects"
            :key="project.id"
            class="project-item"
            type="button"
            :title="project.path"
            @click="openProject(project)"
          >
            <span class="project-symbol" aria-hidden="true"><AppIcon name="folder" :size="16" /></span>
            <span class="project-copy">
              <span class="project-name">{{ project.name }}</span>
              <span class="project-meta">{{ project.sessionCount }} 个会话</span>
            </span>
          </button>
          <p v-if="visibleProjects.length === 0" class="sidebar-empty">暂无项目</p>
        </div>
      </section>
    </div>

    <footer class="sidebar-footer">
      <span class="sidebar-footer-indicator" aria-hidden="true" />
      <span v-if="!sidebarCollapsed">Local workspace</span>
    </footer>
  </aside>
</template>
