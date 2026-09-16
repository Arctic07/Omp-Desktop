<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import {
  Avatar,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Layout as ALayout,
  LayoutContent,
  LayoutHeader,
  LayoutSider,
  Menu,
  MenuItem,
} from '@arco-design/web-vue'
import {
  IconDashboard,
  IconMenuFold,
  IconMenuUnfold,
  IconMessage,
  IconSettings,
  IconUser,
} from '@arco-design/web-vue/es/icon'

import { useAppStore, type AppMenuKey } from '../stores/app'

type MenuItemConfig = {
  key: AppMenuKey
  label: string
  icon: Component
}

const menuItems: MenuItemConfig[] = [
  { key: '/', label: '工作台', icon: IconDashboard },
  { key: '/sessions', label: '会话', icon: IconMessage },
  { key: '/settings', label: '设置', icon: IconSettings },
]

const isMenuKey = (value: string): value is AppMenuKey =>
  menuItems.some((item) => item.key === value)

const route = useRoute()
const router = useRouter()
const { activeMenu, appTitle } = useAppStore()
const collapsed = ref(false)

const currentRoutePath = computed<AppMenuKey>(() =>
  isMenuKey(route.path) ? route.path : '/',
)
const currentTitle = computed(
  () =>
    menuItems.find((item) => item.key === currentRoutePath.value)?.label ??
    '工作台',
)

watch(
  currentRoutePath,
  (path) => {
    activeMenu.value = path
  },
  { immediate: true },
)

function handleMenuClick(key: string) {
  if (isMenuKey(key) && key !== route.path) {
    void router.push(key)
  }
}

function handleCollapse(value: boolean) {
  collapsed.value = value
}
</script>

<template>
  <ALayout class="app-layout">
    <LayoutSider
      class="app-sider"
      :collapsed="collapsed"
      collapsible
      @collapse="handleCollapse"
    >
      <div class="brand-area">
        <div class="brand-mark" aria-hidden="true">O</div>
        <span v-if="!collapsed" class="brand-name">{{ appTitle }}</span>
      </div>

      <Menu
        class="app-menu"
        :selected-keys="[activeMenu]"
        @menu-item-click="handleMenuClick"
      >
        <MenuItem v-for="item in menuItems" :key="item.key">
          <template #icon>
            <component :is="item.icon" />
          </template>
          {{ item.label }}
        </MenuItem>
      </Menu>
    </LayoutSider>

    <ALayout>
      <LayoutHeader class="app-header">
        <div class="header-leading">
          <Button
            class="collapse-button"
            type="text"
            :aria-label="collapsed ? '展开导航' : '收起导航'"
            @click="collapsed = !collapsed"
          >
            <IconMenuUnfold v-if="collapsed" />
            <IconMenuFold v-else />
          </Button>
          <Breadcrumb>
            <BreadcrumbItem>{{ appTitle }}</BreadcrumbItem>
            <BreadcrumbItem>{{ currentTitle }}</BreadcrumbItem>
          </Breadcrumb>
        </div>

        <div class="user-placeholder">
          <Avatar :size="32">
            <IconUser />
          </Avatar>
          <span>用户</span>
        </div>
      </LayoutHeader>

      <LayoutContent class="app-content">
        <RouterView />
      </LayoutContent>
    </ALayout>
  </ALayout>
</template>
