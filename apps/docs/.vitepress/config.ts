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
  'Headless, framework-agnostic forms. Describe a form once with a schema and its rules, and FormTree validates it, submits it, and keeps it typed.'

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
  title: 'FormTree',
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
        { text: 'Introduction', link: '/guide/' },
        { text: 'Why FormTree', link: '/guide/why-formtree' },
        { text: 'Groups', link: '/guide/groups' },
        { text: 'Fields', link: '/guide/fields' },
        { text: 'Validation', link: '/guide/validation' },
        { text: 'Showing Errors', link: '/guide/showing-errors' },
        { text: 'Submitting', link: '/guide/submitting' },
        { text: 'Binding Inputs', link: '/guide/binding-inputs' },
        { text: 'Initial Values and Reset', link: '/guide/initial-values' },
        { text: 'Conditional Fields', link: '/guide/conditional-fields' },
        { text: 'Arrays', link: '/guide/arrays' },
        { text: 'Async Validation', link: '/guide/async-validation' },
        { text: 'Splitting into Components', link: '/guide/components' },
        { text: 'App Setup', link: '/guide/app-setup' },
        { text: 'TypeScript', link: '/guide/typescript' },
        { text: 'Recursive Forms', link: '/guide/recursive-forms' },
      ],

      '/tutorial/': [
        {
          text: 'Building a Checkout',
          items: [
            { text: 'Binding an Input by Hand', link: '/tutorial/checkout/' },
            { text: 'Binding Inputs with useField', link: '/tutorial/checkout/use-field' },
            { text: 'Writing an Input Component', link: '/tutorial/checkout/input-component' },
          ],
        },
        {
          text: 'Building a Trip Booking',
          items: [
            { text: 'Making a Field Conditional', link: '/tutorial/trip-booking/' },
            { text: 'Adding and Removing Rows', link: '/tutorial/trip-booking/rows' },
            { text: 'Validating the Whole List', link: '/tutorial/trip-booking/list-rules' },
            { text: 'Passing an Answer to Each Row', link: '/tutorial/trip-booking/row-dependencies' },
            { text: 'Loading Data from the Server', link: '/tutorial/trip-booking/server-data' },
            { text: 'Submitting in Steps', link: '/tutorial/trip-booking/submitting-steps' },
          ],
        },
      ],

      '/examples/': [
        { text: 'Contact Form', link: '/examples/' },
        { text: 'Radio Group', link: '/examples/radio-group' },
        { text: 'Checkbox Group', link: '/examples/checkbox-group' },
        { text: 'Inline Price Editing', link: '/examples/inline-edit' },
        { text: 'Promo Code Check', link: '/examples/promo-code' },
        { text: 'Rules Based on a Role', link: '/examples/role-based-rules' },
        { text: 'Line Items', link: '/examples/line-items' },
        { text: 'Conditional Checkout', link: '/examples/checkout-branches' },
        { text: 'Segment Builder', link: '/examples/segment-builder' },
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
    ['meta', { property: 'og:title', content: 'FormTree' }],
    ['meta', { property: 'og:description', content: DESCRIPTION }],
    ['meta', { property: 'og:image', content: OG_IMAGE }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: 'FormTree: headless forms that submit in parts' }],
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
