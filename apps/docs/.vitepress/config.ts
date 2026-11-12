import type { DefaultTheme } from 'vitepress'

import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import ts from 'typescript'
import { defineConfig } from 'vitepress'
import { groupIconMdPlugin, groupIconVitePlugin } from 'vitepress-plugin-group-icons'

import { markdownPagesPlugin, writeMarkdownPages } from './page-markdown'
import { FRAMEWORK_HEAD_SCRIPT, FRAMEWORK_STYLE } from './theme/framework'

const DESCRIPTION =
  'Headless, framework-agnostic forms. Describe a form once with a schema and its rules, and formtree validates it, submits it, and keeps it typed.'

const SITE_URL = 'https://form-tree.netlify.app'

const OG_IMAGE = `${SITE_URL}/og-image.png`

const REPOSITORY = 'https://github.com/tinas/formtree'

const PACKAGE_SOURCES = {
  '@formtree/core': packageSource('core'),
  '@formtree/vue': packageSource('vue'),
}

const EXAMPLE_FORMS = [
  'api',
  'schemas',
  'contact',
  'delivery',
  'payment',
  'line-items',
  'promo-code',
  'checkout',
  'account',
  'segment',
  'product',
  'contact-form',
  'drink-order',
  'notifications',
]

const API_SIDEBAR_FILE = new URL('../api/typedoc-sidebar.json', import.meta.url)

export default defineConfig({
  title: 'formtree',
  description: DESCRIPTION,

  cleanUrls: true,
  srcExclude: ['CLAUDE.md'],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
      { text: 'Tutorial', link: '/tutorial/checkout/', activeMatch: '/tutorial/' },
      { text: 'Examples', link: '/examples/', activeMatch: '/examples/' },
      { text: 'API', link: '/api/', activeMatch: '/api/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Quick Start', link: '/guide/quick-start' },
          ],
        },
        {
          text: 'Essentials',
          items: [
            { text: 'Groups', link: '/guide/groups' },
            { text: 'Fields', link: '/guide/fields' },
            { text: 'Arrays', link: '/guide/arrays' },
            { text: 'Conditional Fields', link: '/guide/conditional-fields' },
            { text: 'Validation', link: '/guide/validation' },
            { text: 'Async Validation', link: '/guide/async-validation' },
            { text: 'Showing Errors', link: '/guide/showing-errors' },
            { text: 'Submitting', link: '/guide/submitting' },
            { text: 'Initial Values and Reset', link: '/guide/initial-values' },
          ],
        },
        {
          text: 'Building the UI',
          items: [
            { text: 'App Defaults', link: '/guide/app-defaults' },
            { text: 'Binding Inputs', link: '/guide/binding-inputs' },
            { text: 'Splitting into Components', link: '/guide/components' },
            { text: 'Devtools', link: '/guide/devtools' },
          ],
        },
        {
          text: 'Going Further',
          items: [
            { text: 'Passing Data to Rules', link: '/guide/passing-data' },
            { text: 'Recursive Forms', link: '/guide/recursive-forms' },
            { text: 'TypeScript', link: '/guide/typescript' },
          ],
        },
      ],

      '/tutorial/': [
        {
          text: 'Checkout',
          items: [
            { text: 'Binding an Input by Hand', link: '/tutorial/checkout/' },
            { text: 'Binding with useField', link: '/tutorial/checkout/use-field' },
            { text: 'Writing an Input Component', link: '/tutorial/checkout/input-component' },
          ],
        },
        {
          text: 'Trip Booking',
          items: [
            { text: 'Turning a Field On and Off', link: '/tutorial/trip-booking/' },
            { text: 'Adding and Removing Rows', link: '/tutorial/trip-booking/rows' },
            { text: 'Checking Across Rows', link: '/tutorial/trip-booking/list-rules' },
            { text: 'Passing an Answer Down', link: '/tutorial/trip-booking/row-dependencies' },
            { text: 'Loading Data from the Server', link: '/tutorial/trip-booking/server-data' },
            { text: 'Booking in Steps', link: '/tutorial/trip-booking/submitting-steps' },
          ],
        },
      ],

      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Contact Form', link: '/examples/' },
            { text: 'Radio Group', link: '/examples/radio-group' },
            { text: 'Checkbox Group', link: '/examples/checkbox-group' },
            { text: 'Inline Edit', link: '/examples/inline-edit' },
            { text: 'Promo Code', link: '/examples/promo-code' },
            { text: 'Role-based Rules', link: '/examples/role-based-rules' },
            { text: 'Line Items', link: '/examples/line-items' },
            { text: 'Checkout Branches', link: '/examples/checkout-branches' },
            { text: 'Segment Builder', link: '/examples/segment-builder' },
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

    editLink: {
      pattern: `${REPOSITORY}/edit/main/apps/docs/:path`,
      text: 'Edit this page on GitHub',
    },

    socialLinks: [{ icon: 'github', link: REPOSITORY }],

    search: { provider: 'local' },

    outline: { level: [2, 3] },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present Ahmet Tinastepe',
    },
  },

  buildEnd: siteConfig => writeMarkdownPages(siteConfig, SITE_URL),

  transformPageData(pageData) {
    if (pageData.relativePath.startsWith('api/')) {
      pageData.frontmatter.editLink = false
    }
  },

  head: [
    ['script', {}, FRAMEWORK_HEAD_SCRIPT],
    ['style', {}, FRAMEWORK_STYLE],
    ['link', { rel: 'icon', href: '/logo.svg', sizes: 'any', type: 'image/svg+xml' }],
    ['meta', { name: 'author', content: 'Ahmet Tinastepe' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'formtree' }],
    ['meta', { property: 'og:description', content: DESCRIPTION }],
    ['meta', { property: 'og:image', content: OG_IMAGE }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: 'formtree: forms that submit in parts' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: OG_IMAGE }],
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
    plugins: [groupIconVitePlugin(), markdownPagesPlugin(SITE_URL)],
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
