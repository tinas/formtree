import type { DefaultTheme, Plugin, SiteConfig } from 'vitepress'
import type { Framework } from './theme/framework'

import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'

import { DEFAULT_FRAMEWORK, FRAMEWORK, markdownFileOf } from './theme/framework'

interface PageMarkdownOptions {
  readonly framework: Framework
  readonly filePath: string
  readonly siteUrl: string
}

interface FenceInfo {
  readonly language: string
  readonly title?: string
  readonly twoslash: boolean
}

const CONTAINER_KIND = {
  group: 'group',
  callout: 'callout',
} as const

type ContainerKind = (typeof CONTAINER_KIND)[keyof typeof CONTAINER_KIND]

const FENCE = /^(`{3,})(.*)$/
const FRAMEWORK_BLOCK = /^<div class="([a-z]+)-only">\s*$/
const CONTAINER_OPEN = /^:::\s*([a-z-]+)\s*(.*)$/
const CONTAINER_CLOSE = /^:::\s*$/
const INCLUDE = /^<<<\s+(\S+)(?:\s+\[([^\]]+)\])?\s*$/
const COMPONENT = /^<([A-Z][A-Za-z]*)\b/
const HEADING_ID = /\s+\{#[^}]+\}\s*$/
const ROOT_LINK = /\]\(\//g
const TWOSLASH_CUT = /^\s*\/\/\s*---cut(-before)?---\s*$/
const TWOSLASH_CUT_AFTER = /^\s*\/\/\s*---cut-after---\s*$/
const TWOSLASH_CUT_START = /^\s*\/\/\s*---cut-start---\s*$/
const TWOSLASH_CUT_END = /^\s*\/\/\s*---cut-end---\s*$/
const TWOSLASH_DIRECTIVE = /^\s*\/\/\s*@\w+/
const TWOSLASH_QUERY = /^\s*\/\/\s*\^[?!|]/
const CODE_NOTATION = /\s*(?:\/\/|<!--)\s*\[!code ([^\]:]+)(?::(\d+))?\]\s*(?:-->)?/
const REMOVED_LINES_NOTATION = '--'

const MARKDOWN_URL = new RegExp(
  `^/(.+?)(?:\\.(${Object.values(FRAMEWORK)
    .filter(framework => framework != DEFAULT_FRAMEWORK)
    .join('|')}))?\\.md$`,
)

const CALLOUT_TITLE: Record<string, string> = {
  tip: 'Tip',
  info: 'Info',
  warning: 'Warning',
  danger: 'Danger',
  details: 'Details',
}

const LANGUAGE_OF_EXTENSION: Record<string, string> = {
  '.ts': 'ts',
  '.tsx': 'tsx',
  '.js': 'js',
  '.vue': 'vue',
  '.html': 'html',
  '.css': 'css',
  '.json': 'json',
}

export function pageMarkdown(source: string, { framework, filePath, siteUrl }: PageMarkdownOptions): string {
  const lines = withoutFrontmatter(source).split('\n')
  const output: Array<string> = []
  const containers: Array<ContainerKind> = []
  let openFrameworkBlocks = 0
  let index = 0

  function push(line: string): void {
    const depth = containers.filter(kind => kind == CONTAINER_KIND.callout).length
    output.push(depth == 0 ? line : `${'> '.repeat(depth)}${line}`.trimEnd())
  }

  while (index < lines.length) {
    const line = lines[index]

    const fence = line.match(FENCE)
    if (fence) {
      const end = closingFenceIndex(lines, index, fence[1])
      codeBlock(parseFenceInfo(fence[2]), lines.slice(index + 1, end)).forEach(push)
      index = end + 1
      continue
    }

    const frameworkBlock = line.match(FRAMEWORK_BLOCK)
    if (frameworkBlock) {
      if (frameworkBlock[1] == framework) {
        openFrameworkBlocks += 1
        index += 1
      } else {
        index = closingTagIndex(lines, index, '</div>') + 1
      }
      continue
    }
    if (line.trim() == '</div>' && openFrameworkBlocks > 0) {
      openFrameworkBlocks -= 1
      index += 1
      continue
    }

    if (line.startsWith('<script setup')) {
      index = closingTagIndex(lines, index, '</script>') + 1
      continue
    }

    const component = line.match(COMPONENT)
    if (component) {
      index = line.trimEnd().endsWith('/>') ? index + 1 : closingTagIndex(lines, index, `</${component[1]}>`) + 1
      continue
    }

    const include = line.match(INCLUDE)
    if (include) {
      includedFile(include[1], include[2], filePath).forEach(push)
      index += 1
      continue
    }

    const containerOpen = line.match(CONTAINER_OPEN)
    if (containerOpen) {
      if (containerOpen[1] == 'code-group') {
        containers.push(CONTAINER_KIND.group)
      } else {
        push('')
        containers.push(CONTAINER_KIND.callout)
        push(`**${containerOpen[2].trim() || CALLOUT_TITLE[containerOpen[1]] || containerOpen[1]}**`)
        push('')
      }
      index += 1
      continue
    }
    if (CONTAINER_CLOSE.test(line) && containers.length > 0) {
      if (containers.pop() == CONTAINER_KIND.callout) {
        push('')
      }
      index += 1
      continue
    }

    push(line.replace(HEADING_ID, '').replace(ROOT_LINK, `](${siteUrl}/`))
    index += 1
  }

  return collapseBlankLines(output).join('\n').trim() + '\n'
}

export async function writeMarkdownPages(siteConfig: SiteConfig, siteUrl: string): Promise<void> {
  const pages = siteConfig.pages.filter(page => page != 'index.md')
  const frameworks = Object.values(FRAMEWORK)
  const markdownOf = new Map<string, string>()

  await Promise.all(
    pages.flatMap(page =>
      frameworks.map(async framework => {
        const filePath = join(siteConfig.srcDir, page)
        const markdown = pageMarkdown(await readFile(filePath, 'utf8'), { framework, filePath, siteUrl })
        const target = join(siteConfig.outDir, markdownFileOf(page, framework))
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, markdown)
        if (framework == DEFAULT_FRAMEWORK) {
          markdownOf.set(page, markdown)
        }
      }),
    ),
  )

  const sidebar = siteConfig.site.themeConfig.sidebar as Record<string, Array<DefaultTheme.SidebarItem>>
  const sections = [...sidebar['/guide/'], ...sidebar['/tutorial/'], ...sidebar['/examples/']]
  await writeFile(join(siteConfig.outDir, 'llms.txt'), llmsIndex(siteConfig, sections, siteUrl))
  await writeFile(join(siteConfig.outDir, 'llms-full.txt'), llmsFull(sections, markdownOf))
}

export function markdownPagesPlugin(siteUrl: string): Plugin {
  return {
    name: 'formtree:markdown-pages',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = request.url ?? ''
        const match = url.match(MARKDOWN_URL)
        if (!match || request.headers['sec-fetch-dest'] == 'script') {
          next()
          return
        }
        const filePath = join(server.config.root, `${match[1]}.md`)
        if (!existsSync(filePath)) {
          next()
          return
        }
        const framework = (match[2] as Framework | undefined) ?? DEFAULT_FRAMEWORK
        response.setHeader('Content-Type', 'text/markdown; charset=utf-8')
        response.end(pageMarkdown(readFileSync(filePath, 'utf8'), { framework, filePath, siteUrl }))
      })
    },
  }
}

function llmsIndex(siteConfig: SiteConfig, sections: ReadonlyArray<DefaultTheme.SidebarItem>, siteUrl: string): string {
  const lines = [
    `# ${siteConfig.site.title}`,
    '',
    `> ${siteConfig.site.description}`,
    '',
    'Every page below is Markdown written for Vue. Replace `.md` with `.react.md` or `.javascript.md` for React or plain JavaScript.',
  ]
  for (const section of sections) {
    lines.push('', `## ${section.text}`, '')
    for (const item of section.items ?? []) {
      lines.push(`- [${item.text}](${siteUrl}/${markdownFileOf(pageOfLink(item.link ?? ''), DEFAULT_FRAMEWORK)})`)
    }
  }
  lines.push('', '## API Reference', '')
  for (const name of ['core', 'vue', 'react']) {
    lines.push(`- [@formtree/${name}](${siteUrl}/api/@formtree/${name}/index.md)`)
  }
  return `${lines.join('\n')}\n`
}

function llmsFull(sections: ReadonlyArray<DefaultTheme.SidebarItem>, markdownOf: ReadonlyMap<string, string>): string {
  return sections
    .flatMap(section => section.items ?? [])
    .map(item => markdownOf.get(pageOfLink(item.link ?? '')))
    .filter(markdown => markdown != undefined)
    .join('\n---\n\n')
}

function pageOfLink(link: string): string {
  const path = link.replace(/^\//, '')
  return path.endsWith('/') || path == '' ? `${path}index.md` : `${path}.md`
}

function withoutFrontmatter(source: string): string {
  return source.startsWith('---\n') ? source.slice(source.indexOf('\n---\n', 4) + 5) : source
}

function closingFenceIndex(lines: ReadonlyArray<string>, start: number, marker: string): number {
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].trim() == marker) {
      return index
    }
  }
  return lines.length
}

function closingTagIndex(lines: ReadonlyArray<string>, start: number, tag: string): number {
  let fence: string | undefined
  for (let index = start + 1; index < lines.length; index += 1) {
    const marker = lines[index].match(FENCE)?.[1]
    if (marker != undefined && (fence == undefined || lines[index].trim() == fence)) {
      fence = fence == undefined ? marker : undefined
      continue
    }
    if (fence == undefined && lines[index].trim() == tag) {
      return index
    }
  }
  return lines.length
}

function parseFenceInfo(info: string): FenceInfo {
  return {
    language: info.trim().match(/^[^\s{[]*/)?.[0] ?? '',
    title: info.match(/\[([^\]]+)\]/)?.[1],
    twoslash: /\btwoslash\b/.test(info),
  }
}

function codeBlock({ language, title, twoslash }: FenceInfo, body: ReadonlyArray<string>): Array<string> {
  const code = withoutCodeNotations(twoslash ? visibleTwoslashLines(body) : body)
  const opening = title == undefined ? `\`\`\`${language}` : `\`\`\`${language} title="${title}"`
  return ['', opening, ...trimBlankEdges(code), '```', '']
}

function withoutCodeNotations(lines: ReadonlyArray<string>): Array<string> {
  const code: Array<string> = []
  let removedLinesAhead = 0
  for (const line of lines) {
    if (removedLinesAhead > 0) {
      removedLinesAhead -= 1
      continue
    }
    const notation = line.match(CODE_NOTATION)
    if (notation == null) {
      code.push(line)
      continue
    }
    const text = line.replace(CODE_NOTATION, '')
    const onItsOwnLine = text.trim() == ''
    if (notation[1] == REMOVED_LINES_NOTATION) {
      removedLinesAhead = Number(notation[2] ?? 1) - (onItsOwnLine ? 0 : 1)
    } else if (!onItsOwnLine) {
      code.push(text)
    }
  }
  return code
}

function visibleTwoslashLines(body: ReadonlyArray<string>): Array<string> {
  const cut = body.findIndex(line => TWOSLASH_CUT.test(line))
  const afterCut = cut == -1 ? body : body.slice(cut + 1)
  const cutAfter = afterCut.findIndex(line => TWOSLASH_CUT_AFTER.test(line))
  const shown = cutAfter == -1 ? afterCut : afterCut.slice(0, cutAfter)
  const visible: Array<string> = []
  let hidden = false
  for (const line of shown) {
    if (TWOSLASH_CUT_START.test(line)) {
      hidden = true
    } else if (TWOSLASH_CUT_END.test(line)) {
      hidden = false
    } else if (!hidden && !TWOSLASH_DIRECTIVE.test(line) && !TWOSLASH_QUERY.test(line)) {
      visible.push(line)
    }
  }
  return visible
}

function includedFile(path: string, title: string | undefined, filePath: string): Array<string> {
  const includedPath = resolve(dirname(filePath), path.replace(/^@/, '.'))
  const language = LANGUAGE_OF_EXTENSION[extname(includedPath)] ?? ''
  const body = readFileSync(includedPath, 'utf8').replace(/\n$/, '').split('\n')
  return codeBlock({ language, title: title ?? path, twoslash: false }, body)
}

function trimBlankEdges(lines: ReadonlyArray<string>): Array<string> {
  let start = 0
  let end = lines.length
  while (start < end && lines[start].trim() == '') {
    start += 1
  }
  while (end > start && lines[end - 1].trim() == '') {
    end -= 1
  }
  return lines.slice(start, end)
}

function collapseBlankLines(lines: ReadonlyArray<string>): Array<string> {
  const collapsed: Array<string> = []
  let fence: string | undefined
  for (const line of lines) {
    const marker = line.replace(/^(> )+/, '').match(FENCE)?.[1]
    if (marker != undefined) {
      fence = fence == undefined ? marker : undefined
    }
    const blank = line.replace(/^(> ?)+/, '').trim() == ''
    const previousBlank = collapsed.length == 0 || collapsed[collapsed.length - 1].replace(/^(> ?)+/, '').trim() == ''
    if (fence == undefined && blank && previousBlank) {
      continue
    }
    collapsed.push(line)
  }
  return collapsed
}
