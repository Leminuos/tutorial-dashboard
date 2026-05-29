import { createHighlighter } from 'shiki'
import shikiConfig from '@/config/shiki.config'

const _htmlCache = new Map()

export function useShikiHighlighter() {
  let highlighterPromise = null

  function getHighlighter () {
    if (!highlighterPromise) {
      highlighterPromise = createHighlighter({
        themes: ['github-light', 'github-dark'],
        langs: shikiConfig.supportedLangs
      })
    }

    return highlighterPromise
  }

  async function highlightCodeToHtml(code, lang, themeOptions) {
    const highlighter = await getHighlighter()
    const finalLang = shikiConfig.supportedLangs.includes(lang) ? lang : 'text'

    const colorOptions = themeOptions?.themes
      ? { themes: themeOptions.themes, defaultColor: false }
      : { theme: themeOptions?.theme || 'github-dark' }

    return highlighter.codeToHtml(code, {
      lang: finalLang,
      ...colorOptions,
    })
  }

  async function highlightMarkdownHtml(rawHtml, {
    theme = 'github-dark',
    themes,
    wrap
  } = {}) {
    const themeKey = themes ? JSON.stringify(themes) : theme
    const cacheKey = `${themeKey}::${rawHtml.length}::${rawHtml.slice(0, 200)}` // lightweight key
    if (_htmlCache.has(cacheKey)) return _htmlCache.get(cacheKey)

    const parser = new DOMParser()
    const doc = parser.parseFromString(rawHtml, 'text/html')
    const blocks = doc.querySelectorAll('pre > code')

    for (const el of blocks) {
      const className = el.className || ''
      const match = className.match(/language-(\w+)/)
      const lang = match ? match[1] : 'text'
      const code = el.textContent || ''
      const shikiHtml = await highlightCodeToHtml(code, lang, { theme, themes })
      const pre = el.parentElement

      if (pre) {
        // Preserve data-title attribute from original pre
        const dataTitle = pre.getAttribute('data-title')

        const wrapper = doc.createElement('div')
        wrapper.innerHTML = wrap ? wrap(shikiHtml, lang, dataTitle) : shikiHtml
        pre.replaceWith(wrapper.firstElementChild)
      }
    }

    const out = doc.body.innerHTML
    _htmlCache.set(cacheKey, out)
    return out
  }

  return { highlightMarkdownHtml }
}
