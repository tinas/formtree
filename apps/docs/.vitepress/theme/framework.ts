export const FRAMEWORK = {
  vue: 'vue',
  react: 'react',
  javascript: 'javascript',
} as const

export type Framework = (typeof FRAMEWORK)[keyof typeof FRAMEWORK]

export const FRAMEWORK_LABEL: Record<Framework, string> = {
  vue: 'Vue',
  react: 'React',
  javascript: 'JavaScript',
}

export const FRAMEWORK_PACKAGE: Record<Framework, string> = {
  vue: '@formtree/vue',
  react: '@formtree/react',
  javascript: '@formtree/core',
}

export const DEFAULT_FRAMEWORK: Framework = FRAMEWORK.vue

export const FRAMEWORK_QUERY_PARAM = 'framework'

export function markdownFileOf(page: string, framework: Framework): string {
  return framework == DEFAULT_FRAMEWORK ? page : page.replace(/\.md$/, `.${framework}.md`)
}

const FRAMEWORKS: ReadonlyArray<string> = Object.values(FRAMEWORK)

export function isFramework(value: unknown): value is Framework {
  return typeof value == 'string' && FRAMEWORKS.includes(value)
}

export const FRAMEWORK_HEAD_SCRIPT = `{
  const requested = new URLSearchParams(location.search).get('${FRAMEWORK_QUERY_PARAM}')
  document.documentElement.dataset.framework = ${JSON.stringify(FRAMEWORKS)}.includes(requested) ? requested : '${DEFAULT_FRAMEWORK}'
}`

export const FRAMEWORK_STYLE = `${FRAMEWORKS.flatMap(hiddenSelectors).join(',\n')} { display: none; }`

function hiddenSelectors(framework: string): Array<string> {
  const otherFramework =
    framework == DEFAULT_FRAMEWORK
      ? `html[data-framework]:not([data-framework='${framework}'])`
      : `html:not([data-framework='${framework}'])`
  return [
    `${otherFramework} .${framework}-only`,
    `${otherFramework} .VPDocOutlineItem > li:has(> a[href^='#${framework}-only-'])`,
    `${otherFramework} .VPDocAsideOutline:not(:has(.outline-link:not([href^='#${framework}-only-'])))`,
  ]
}
