import './style.css'

import { createFormTreePlugin } from '@formtree/vue'
import { createApp } from 'vue'

import App from './app.vue'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

createApp(App)
  .use(createFormTreePlugin({ focusElement: focusSmoothly }))
  .mount('#app')

function focusSmoothly(element: HTMLElement): void {
  element.focus({ preventScroll: true })
  element.scrollIntoView({ block: 'center', behavior: matchMedia(REDUCED_MOTION_QUERY).matches ? 'instant' : 'smooth' })
}
