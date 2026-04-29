import { createHighlighter, type Highlighter } from 'shiki'

let highlighterPromise: Promise<Highlighter> | null = null

const PRELOAD_LANGS = [
  'typescript', 'javascript', 'jsx', 'tsx',
  'python', 'bash', 'shell',
  'json', 'yaml', 'toml',
  'html', 'css', 'scss',
  'sql', 'graphql',
  'php', 'go', 'rust', 'java', 'ruby', 'c', 'cpp',
  'markdown', 'diff', 'dockerfile',
] as const

const THEME = 'github-dark-default'

export function getShikiHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [THEME],
      langs: [...PRELOAD_LANGS],
    })
  }
  return highlighterPromise
}

export async function highlightCode(code: string, lang: string): Promise<string> {
  const highlighter = await getShikiHighlighter()
  const loadedLangs = highlighter.getLoadedLanguages()
  const safeLang = loadedLangs.includes(lang as never) ? lang : 'text'

  return highlighter.codeToHtml(code, {
    lang: safeLang,
    theme: THEME,
  })
}

export { THEME }
