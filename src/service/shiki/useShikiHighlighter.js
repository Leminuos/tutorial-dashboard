import { createHighlighter } from 'shiki'
import shikiConfig from '@/config/shiki.config';

const _htmlCache = new Map()

export function useShikiHighlighter() {
  let highlighterPromise = null;

  function getHighlighter () {
    if (!highlighterPromise) {
      highlighterPromise = createHighlighter({
        themes: ['one-dark-pro'],
        langs: shikiConfig.supportedLangs
      })
    }

    return highlighterPromise
  }

  async function highlightCodeToHtml(code, lang, theme) {
    const highlighter = await getHighlighter()
    const finalLang = shikiConfig.supportedLangs.includes(lang) ? lang : 'text'

    return highlighter.codeToHtml(code, {
      lang: finalLang,
      theme: theme || "one-dark-pro",
    });
  }

  async function highlightMarkdownHtml(rawHtml, { theme = "one-dark-pro", wrap } = {}) {
    const cacheKey = `${theme}::${rawHtml.length}::${rawHtml.slice(0, 200)}`; // lightweight key
    if (_htmlCache.has(cacheKey)) return _htmlCache.get(cacheKey)

    const parser = new DOMParser()
    const doc = parser.parseFromString(rawHtml, 'text/html')
    const blocks = doc.querySelectorAll('pre > code')

    for (const el of blocks) {
      const className = el.className || ''
      const match = className.match(/language-(\w+)/)
      const lang = match ? match[1] : 'text'
      const code = el.textContent || ''
      const shikiHtml = await highlightCodeToHtml(code, lang, theme)
      const pre = el.parentElement

      if (pre) {
        const wrapper = doc.createElement('div')
        wrapper.innerHTML = wrap ? wrap(shikiHtml, lang) : shikiHtml
        pre.replaceWith(wrapper.firstElementChild)
      }
    }

    const out = doc.body.innerHTML
    _htmlCache.set(cacheKey, out);
    return out
  }

  return { highlightMarkdownHtml }
}
