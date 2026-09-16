import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

import HomePage from '../pages/HomePage.vue'
import ProjectsPage from '../pages/ProjectsPage.vue'
import PullRequestsPage from '../pages/PullRequestsPage.vue'
import ScheduledPage from '../pages/ScheduledPage.vue'
import SettingsPage from '../pages/SettingsPage.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: { title: '工作台', page: 'chat' },
  },
  {
    path: '/projects',
    name: 'projects',
    component: ProjectsPage,
    meta: { title: '项目', page: 'projects' },
  },
  {
    path: '/pulls',
    name: 'pulls',
    component: PullRequestsPage,
    meta: { title: '拉取请求', page: 'pulls' },
  },
  {
    path: '/scheduled',
    name: 'scheduled',
    component: ScheduledPage,
    meta: { title: '计划任务', page: 'scheduled' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsPage,
    meta: { title: '设置', page: 'settings' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

export default router
