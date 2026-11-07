import type { Router } from 'vitepress'
import type { Framework } from './framework'

import { DEFAULT_FRAMEWORK, FRAMEWORK_PACKAGE, FRAMEWORK_QUERY_PARAM, isFramework } from './framework'

const API_HOME_PATHS: ReadonlyArray<string> = ['/api', '/api/']

export function appliedFramework(): Framework {
  const applied = document.documentElement.dataset.framework
  return isFramework(applied) ? applied : DEFAULT_FRAMEWORK
}

export function restoreFrameworkFromUrl(): void {
  if (document.documentElement.dataset.framework != undefined) {
    return
  }
  const requested = new URLSearchParams(location.search).get(FRAMEWORK_QUERY_PARAM)
  document.documentElement.dataset.framework = isFramework(requested) ? requested : DEFAULT_FRAMEWORK
}

export function applyFramework(framework: Framework): void {
  document.documentElement.dataset.framework = framework
  writeFrameworkToUrl()
}

export function writeFrameworkToUrl(): void {
  const framework = appliedFramework()
  const url = new URL(location.href)
  if (framework == DEFAULT_FRAMEWORK) {
    url.searchParams.delete(FRAMEWORK_QUERY_PARAM)
  } else {
    url.searchParams.set(FRAMEWORK_QUERY_PARAM, framework)
  }
  history.replaceState(history.state, '', url)
}

export function redirectApiHome(href: string, router: Router): boolean {
  if (!API_HOME_PATHS.includes(new URL(href, location.origin).pathname)) {
    return true
  }
  void router.go(`/api/${FRAMEWORK_PACKAGE[appliedFramework()]}/`, { replace: true })
  return false
}
