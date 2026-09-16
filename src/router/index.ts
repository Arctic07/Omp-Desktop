import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

import HomePage from '../pages/HomePage.vue'
import PlaceholderPage from '../pages/PlaceholderPage.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: { title: '工作台' },
  },
  {
    path: '/sessions',
    name: 'sessions',
    component: PlaceholderPage,
    props: {
      title: '会话',
      description: '会话能力将在后续版本接入。',
    },
    meta: { title: '会话' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: PlaceholderPage,
    props: {
      title: '设置',
      description: '应用设置将在后续版本接入。',
    },
    meta: { title: '设置' },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

export default router
