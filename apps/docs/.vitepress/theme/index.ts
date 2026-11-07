import type { Theme } from 'vitepress'

import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'
import { inBrowser } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'

import '@shikijs/vitepress-twoslash/style.css'
import 'virtual:group-icons.css'
import './style.css'

import DemoFrame from '../components/demo-frame.vue'
import FrameworkSelect from '../components/framework-select.vue'
import { redirectApiHome, restoreFrameworkFromUrl, writeFrameworkToUrl } from './framework-preference'

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'sidebar-nav-before': () => h(FrameworkSelect),
    }),
  enhanceApp({ app, router }) {
    if (inBrowser) {
      restoreFrameworkFromUrl()
      router.onBeforePageLoad = href => redirectApiHome(href, router)
      router.onAfterRouteChange = writeFrameworkToUrl
    }
    app.use(TwoslashFloatingVue)
    app.component('DemoFrame', DemoFrame)
  },
} satisfies Theme
