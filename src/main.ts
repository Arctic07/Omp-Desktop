import { createApp } from 'vue'

import App from './App.vue'
import './styles/source.css'

const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')

function syncTheme(event?: MediaQueryListEvent) {
  document.body.toggleAttribute('data-ds-dark-theme', event?.matches ?? colorScheme.matches)
}

syncTheme()
colorScheme.addEventListener('change', syncTheme)

createApp(App).mount('#app')
