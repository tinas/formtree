import type { FormDefaults } from '@formtree/core'
import type { Plugin } from 'vue'

import { connectDevtools } from './devtools'
import { FORMTREE_APP } from './formtree-app'

declare const process: { readonly env: { readonly NODE_ENV?: string } }

/**
 * Options of {@link createFormtree}: defaults for every form of the app, and whether the forms appear in Vue
 * Devtools.
 *
 * @category Form
 */
export interface FormtreeOptions extends FormDefaults {
  /**
   * Shows the app's forms in Vue Devtools while developing. Production builds never include the devtools code.
   *
   * @defaultValue `true`
   */
  readonly devtools?: boolean
}

/**
 * Creates the app plugin. Every form created with `useForm` inside the app starts from these defaults, and options
 * passed to `useForm` override them.
 *
 * @category Form
 */
export function createFormtree(options: FormtreeOptions = {}): Plugin {
  const { devtools = true, ...defaults } = options
  return {
    install(app) {
      const registry = devtools && process.env.NODE_ENV != 'production' ? connectDevtools(app) : undefined
      app.provide(FORMTREE_APP, { defaults, registry })
    },
  }
}
