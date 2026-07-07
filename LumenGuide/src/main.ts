import { createApp } from 'vue'
import App from './App.vue'
import './styles/theme.css'

const app = createApp(App)

app.config.errorHandler = (err) => {
  console.error('[Vue error]', err)
}

app.config.warnHandler = (msg) => {
  console.warn('[Vue warn]', msg)
}

app.mount('#app')

