import type { DefaultTheme } from 'vitepress'

import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import ts from 'typescript'
import { defineConfig } from 'vitepress'
import { groupIconMdPlugin, groupIconVitePlugin } from 'vitepress-plugin-group-icons'

const DESCRIPTION =
  'Forms that submit in parts. Steps, cards, rows and single fields each validate and submit on their own.'

const PACKAGE_SOURCES = {
  '@formtree/core': packageSource('core'),
  '@formtree/vue': packageSource('vue'),
}

const EXAMPLE_FORMS = ['api', 'schemas', 'checkout', 'account', 'segment', 'product', 'sign-up']

const API_SIDEBAR_FILE = new URL('../api/typedoc-sidebar.json', import.meta.url)

export default defineConfig({
  title: 'formtree',
  description: DESCRIPTION,

  cleanUrls: true,

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
      { text: 'Vue', link: '/vue/', activeMatch: '/vue/' },
      { text: 'React', link: '/react/', activeMatch: '/react/' },
      { text: 'Examples', link: '/examples/', activeMatch: '/examples/' },
      { text: 'API', link: '/api/', activeMatch: '/api/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'How It Works', link: '/guide/how-it-works' },
          ],
        },
        {
          text: 'Building Blocks',
          items: [
            { text: 'Fields', link: '/guide/fields' },
            { text: 'Groups', link: '/guide/groups' },
            { text: 'Arrays', link: '/guide/arrays' },
          ],
        },
        {
          text: 'Shape and Context',
          items: [
            { text: 'Conditional Branches', link: '/guide/conditional-branches' },
            { text: 'Dependencies', link: '/guide/dependencies' },
            { text: 'Recursive Definitions', link: '/guide/recursive-definitions' },
          ],
        },
        {
          text: 'Behaviour',
          items: [
            { text: 'Lifecycle', link: '/guide/lifecycle' },
            { text: 'Validation', link: '/guide/validation' },
            { text: 'Submitting', link: '/guide/submitting' },
            { text: 'Errors and Focus', link: '/guide/errors-and-focus' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'Types', link: '/guide/types' },
            { text: 'Design Rules', link: '/guide/design-rules' },
          ],
        },
      ],

      '/vue/': [
        {
          text: 'Vue',
          items: [
            { text: 'Overview', link: '/vue/' },
            { text: 'Node Context', link: '/vue/node-context' },
            { text: 'Field Bindings', link: '/vue/field-bindings' },
            { text: 'Devtools', link: '/vue/devtools' },
          ],
        },
      ],

      '/react/': [
        {
          text: 'React',
          items: [
            { text: 'Overview', link: '/react/' },
            { text: 'Node Context', link: '/react/node-context' },
            { text: 'Field Bindings', link: '/react/field-bindings' },
          ],
        },
      ],

      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Checkout Branches', link: '/examples/' },
            { text: 'Role-based Rules', link: '/examples/role-based-rules' },
            { text: 'Segment Builder', link: '/examples/segment-builder' },
            { text: 'Line Items', link: '/examples/line-items' },
            { text: 'Promo Code', link: '/examples/promo-code' },
            { text: 'Inline Edit', link: '/examples/inline-edit' },
          ],
        },
      ],

      '/api/': [
        {
          text: 'API Reference',
          items: [{ text: 'Overview', link: '/api/' }, ...apiSidebar()],
        },
      ],
    },

    search: { provider: 'local' },

    outline: { level: [2, 3] },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present Ahmet Tinastepe',
    },
  },

  head: [
    ['link', { rel: 'icon', href: '/logo.svg', sizes: 'any', type: 'image/svg+xml' }],
    ['meta', { name: 'author', content: 'Ahmet Tinastepe' }],
    ['meta', { property: 'og:title', content: 'formtree' }],
    ['meta', { property: 'og:description', content: DESCRIPTION }],
  ],

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'one-dark-pro',
    },
    languages: ['js', 'ts', 'json', 'html'],
    codeTransformers: [
      transformerTwoslash({
        twoslashOptions: {
          compilerOptions: {
            strict: true,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
            paths: {
              '@formtree/core': [PACKAGE_SOURCES['@formtree/core']],
              '@formtree/vue': [PACKAGE_SOURCES['@formtree/vue']],
              '@formtree/vue/devtools': [
                fileURLToPath(new URL('../../../packages/vue/src/devtools/index.ts', import.meta.url)),
              ],
            },
          },
          extraFiles: exampleFormFiles(),
        },
      }),
    ],
    config(md) {
      md.use(groupIconMdPlugin)
    },
  },

  vite: {
    plugins: [groupIconVitePlugin()],
    resolve: {
      alias: PACKAGE_SOURCES,
    },
  },
})

function packageSource(name: string): string {
  return fileURLToPath(new URL(`../../../packages/${name}/src/index.ts`, import.meta.url))
}

function apiSidebar(): Array<DefaultTheme.SidebarItem> {
  return existsSync(API_SIDEBAR_FILE) ? JSON.parse(readFileSync(API_SIDEBAR_FILE, 'utf8')) : []
}

function exampleFormFiles(): Record<string, string> {
  return Object.fromEntries(
    EXAMPLE_FORMS.map(name => [
      `forms/${name}.ts`,
      readFileSync(new URL(`../examples/forms/${name}.ts`, import.meta.url), 'utf8'),
    ]),
  )
}
