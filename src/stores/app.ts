import { ref } from 'vue'

export type AppMenuKey = '/' | '/sessions' | '/settings'

const activeMenu = ref<AppMenuKey>('/')
const appTitle = ref('OMP Desktop')

export function useAppStore() {
  return {
    activeMenu,
    appTitle,
  }
}
