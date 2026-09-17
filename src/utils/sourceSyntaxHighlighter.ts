import { createHighlighterCore } from 'shiki/core'
import type {
  HighlighterCore,
  LanguageRegistration,
  ThemedToken,
  ThemeRegistrationAny,
} from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

export type SourceSyntaxTheme = 'github-dark' | 'github-light'

export type SourceSyntaxLanguage =
  | 'typescript'
  | 'tsx'
  | 'javascript'
  | 'jsx'
  | 'json'
  | 'css'
  | 'html'
  | 'markdown'
  | 'rust'
  | 'python'
  | 'go'
  | 'shellscript'
  | 'yaml'
  | 'toml'
  | 'sql'
  | 'swift'
  | 'kotlin'
  | 'java'
  | 'c'
  | 'cpp'
  | 'powershell'

export type SourceHighlightedToken = ThemedToken
export type SourceHighlightedLines = readonly (readonly SourceHighlightedToken[])[]

type LanguageModule = {
  default: LanguageRegistration[]
}

type ThemeModule = {
  default: ThemeRegistrationAny
}

type LanguageLoader = () => Promise<LanguageModule>
type ThemeLoader = () => Promise<ThemeModule>

const languageAliases: Readonly<Record<string, SourceSyntaxLanguage>> = {
  typescript: 'typescript',
  ts: 'typescript',
  tsx: 'tsx',
  javascript: 'javascript',
  js: 'javascript',
  jsx: 'jsx',
  json: 'json',
  css: 'css',
  html: 'html',
  markdown: 'markdown',
  md: 'markdown',
  rust: 'rust',
  rs: 'rust',
  python: 'python',
  py: 'python',
  go: 'go',
  shellscript: 'shellscript',
  shell: 'shellscript',
  sh: 'shellscript',
  bash: 'shellscript',
  zsh: 'shellscript',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  sql: 'sql',
  swift: 'swift',
  kotlin: 'kotlin',
  kt: 'kotlin',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  hpp: 'cpp',
  powershell: 'powershell',
  pwsh: 'powershell',
}

const languageLoaders: Readonly<Record<SourceSyntaxLanguage, LanguageLoader>> = {
  typescript: () => import('shiki/langs/typescript.mjs'),
  tsx: () => import('shiki/langs/tsx.mjs'),
  javascript: () => import('shiki/langs/javascript.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  html: () => import('shiki/langs/html.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'),
  rust: () => import('shiki/langs/rust.mjs'),
  python: () => import('shiki/langs/python.mjs'),
  go: () => import('shiki/langs/go.mjs'),
  shellscript: () => import('shiki/langs/shellscript.mjs'),
  yaml: () => import('shiki/langs/yaml.mjs'),
  toml: () => import('shiki/langs/toml.mjs'),
  sql: () => import('shiki/langs/sql.mjs'),
  swift: () => import('shiki/langs/swift.mjs'),
  kotlin: () => import('shiki/langs/kotlin.mjs'),
  java: () => import('shiki/langs/java.mjs'),
  c: () => import('shiki/langs/c.mjs'),
  cpp: () => import('shiki/langs/cpp.mjs'),
  powershell: () => import('shiki/langs/powershell.mjs'),
}

const themeLoaders: Readonly<Record<SourceSyntaxTheme, ThemeLoader>> = {
  'github-dark': () => import('shiki/themes/github-dark.mjs'),
  'github-light': () => import('shiki/themes/github-light.mjs'),
}

let corePromise: Promise<HighlighterCore> | null = null
const readyLanguages = new Set<SourceSyntaxLanguage>()
const pendingLanguageLoads = new Map<SourceSyntaxLanguage, Promise<void>>()
const failedLanguageLoads = new Map<SourceSyntaxLanguage, unknown>()
const readyThemes = new Set<SourceSyntaxTheme>()
const pendingThemeLoads = new Map<SourceSyntaxTheme, Promise<void>>()
const failedThemeLoads = new Map<SourceSyntaxTheme, unknown>()

function getHighlighterCore(): Promise<HighlighterCore> {
  if (corePromise === null) {
    corePromise = createHighlighterCore({
      engine: createJavaScriptRegexEngine(),
      langs: [],
      themes: [],
    })
  }
  return corePromise
}

async function ensureLanguageLoaded(language: SourceSyntaxLanguage): Promise<HighlighterCore> {
  const highlighter = await getHighlighterCore()
  if (readyLanguages.has(language)) {
    return highlighter
  }

  if (failedLanguageLoads.has(language)) {
    throw failedLanguageLoads.get(language)
  }

  const pending = pendingLanguageLoads.get(language)
  if (pending !== undefined) {
    await pending
    return highlighter
  }

  const loadPromise = (async (): Promise<void> => {
    try {
      const languageModule = await languageLoaders[language]()
      await highlighter.loadLanguage(languageModule.default)
      readyLanguages.add(language)
    } catch (error: unknown) {
      failedLanguageLoads.set(language, error)
      throw error
    } finally {
      pendingLanguageLoads.delete(language)
    }
  })()
  pendingLanguageLoads.set(language, loadPromise)
  await loadPromise
  return highlighter
}

async function ensureThemeLoaded(highlighter: HighlighterCore, theme: SourceSyntaxTheme): Promise<void> {
  if (readyThemes.has(theme)) {
    return
  }

  if (failedThemeLoads.has(theme)) {
    throw failedThemeLoads.get(theme)
  }

  const pending = pendingThemeLoads.get(theme)
  if (pending !== undefined) {
    await pending
    return
  }

  const loadPromise = (async (): Promise<void> => {
    try {
      const themeModule = await themeLoaders[theme]()
      await highlighter.loadTheme(themeModule.default)
      readyThemes.add(theme)
    } catch (error: unknown) {
      failedThemeLoads.set(theme, error)
      throw error
    } finally {
      pendingThemeLoads.delete(theme)
    }
  })()
  pendingThemeLoads.set(theme, loadPromise)
  await loadPromise
}

export function resolveSourceSyntaxLanguage(extensionOrLanguage: string): SourceSyntaxLanguage | null {
  const normalized = extensionOrLanguage.trim().toLowerCase().replace(/^\./, '')
  return languageAliases[normalized] ?? null
}

export async function highlightSourceCode(
  code: string,
  language: SourceSyntaxLanguage,
  theme: SourceSyntaxTheme,
): Promise<SourceHighlightedLines> {
  const highlighter = await ensureLanguageLoaded(language)
  await ensureThemeLoaded(highlighter, theme)
  return highlighter.codeToTokensBase(code, { lang: language, theme })
}
