import './style.css'

import { formtreeDevtools } from '@formtree/vue/devtools'
import { createApp } from 'vue'

import App from './app.vue'

const app = createApp(App)

if (import.meta.env.DEV) {
  app.use(formtreeDevtools)
}

app.mount('#app')
