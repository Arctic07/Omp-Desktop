import { createApp } from 'vue'

import App from './App.vue'
import { initializeAppSettings } from './stores/appSettings'
import './styles/source.css'

initializeAppSettings()

createApp(App).mount('#app')
